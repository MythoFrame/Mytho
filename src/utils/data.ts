import moment from "moment";
import soapRequest from "easy-soap-request";
import { Connection, createConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { clearIntervalAsync, fixed as interval, SetIntervalAsyncTimer } from "set-interval-async";
import { DOMParser } from "@xmldom/xmldom";
import { List } from "../sfd/list.js";
import { Post } from "../sfd/post.js";
import { Logger } from "./logger.js";
import { isDeepStrictEqual } from "node:util";

export abstract class Database {
  private static db: Connection;

  public static async connect(database: string): Promise<void> {
    Logger.LogDebug(`Connecting to the database (${database})`);
    Database.db = await createConnection({
      host: "localhost",
      user: "root",
      database: database
    });
    await DataCollector.collectDatabasePosts();
  }

  public static async query<T extends RowDataPacket[] | ResultSetHeader>(query: string, ...args: any[]): Promise<T> {
    // Logger.LogDebug(`Executing query: ${query} with ${args.join(", ")}`);
    const [rows] = await Database.db.execute<T>(query, args);
    return rows;
  }
}

export abstract class DataCollector {
  private static databasePosts: IPost[] = [];
  private static serverDataTimer: SetIntervalAsyncTimer;
  private static databasePostsTimer: SetIntervalAsyncTimer;

  public static async startCollectingData(): Promise<void> {
    Logger.LogDebug("Starting collecting data");
    if (DataCollector.serverDataTimer !== undefined) {
      Logger.LogDebug("Resetting 'CollectServerData' Interval");
      await clearIntervalAsync(DataCollector.serverDataTimer);
    }
    if (DataCollector.databasePostsTimer !== undefined) {
      Logger.LogDebug("Resetting 'CollectDatabasePosts' Interval");
      await clearIntervalAsync(DataCollector.databasePostsTimer);
    }
    DataCollector.serverDataTimer = interval.setIntervalAsync(DataCollector.collectServerData, 60000);
    DataCollector.databasePostsTimer = interval.setIntervalAsync(DataCollector.collectDatabasePosts, 1000000);
  }

  public static getDatabasePosts() {
    return DataCollector.databasePosts;
  }

  public static async getServers(): Promise<{ totalPlayers: number; servers: ISFDServerData[] }> {
    const xml: string =
      "<?xml version=\"1.0\" encoding=\"utf-8\"?><soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"><soap:Body><GetGameServers xmlns=\"https://mythologicinteractive.com/Games/SFD/\"><validationToken>1.3.7d</validationToken></GetGameServers></soap:Body></soap:Envelope>";
    const url: string = "https://mythologicinteractive.com/SFDGameServices.asmx";
    const sampleHeaders = {
      Host: "mythologicinteractive.com",
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "\"https://mythologicinteractive.com/Games/SFD/GetGameServers\""
    };
    const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml });
    const { body } = response;
    const parser: DOMParser = new DOMParser();
    const xmlDoc: Document = parser.parseFromString(body, "text/xml");

    const servers: ISFDServerData[] = [];
    let totalPlayers = 0;
    const elements: HTMLCollectionOf<Element> = xmlDoc.getElementsByTagName("SFDGameServer");
    for (let i = 0; i < elements.length; i++) {
      totalPlayers += parseInt(elements[i].childNodes[7].textContent!);

      const data: ISFDServerData = {
        AddressIPv4: elements[i].childNodes[0].textContent!,
        AddressIPv6: elements[i].childNodes[1].textContent!,
        LIP: elements[i].childNodes[2].textContent!,
        Port: Number.parseInt(elements[i].childNodes[3].textContent!),
        GameName: elements[i].childNodes[4].textContent!,
        GameMode: Number.parseInt(elements[i].childNodes[5].textContent!),
        MapName: elements[i].childNodes[6].textContent!,
        Players: Number.parseInt(elements[i].childNodes[7].textContent!),
        MaxPlayers: Number.parseInt(elements[i].childNodes[8].textContent!),
        Bots: Number.parseInt(elements[i].childNodes[9].textContent!),
        HasPassword: elements[i].childNodes[10].textContent! === "true",
        Description: elements[i].childNodes[11].textContent!,
        Version: elements[i].childNodes[12].textContent!,
        VersionNr: Number.parseInt(elements[i].childNodes[13].textContent!),
        ApplicationInstance: elements[i].childNodes[14].textContent!
      };

      servers.push(data);
    }

    return { totalPlayers: totalPlayers, servers: servers };
  }

  public static async collectDatabasePosts(): Promise<void> {
    // Logger.LogDebug("Fetching database posts...");
    const rows = await Database.query<RowDataPacket[]>("SELECT description, title FROM category JOIN post ON id_category = category.id");
    const posts = rows.map(r => <IPost>{ Title: r.title, Description: r.description });

    if (!isDeepStrictEqual(DataCollector.databasePosts, posts)) {
      Logger.LogDebug("New posts found! Refreshing list and post commands");
      DataCollector.databasePosts = posts;
      List.initCategories();
      Post.initPosts();
    }
  }

  public static calculateActivity(data: Map<string, number>, count: number): Map<string, string> {
    data = new Map([...data.entries()].sort((a, b) => b[1] - a[1]).splice(0, count));
    const activity = new Map<string, string>();
    for (const [name, players] of data.entries()) {
      activity.set(name, players > 60 ? Math.floor(players / 60) + "h " + (players % 60) + "m" : players + "m");
    }
    return activity;
  }

  private static async collectServerData(): Promise<void> {
    // Logger.LogDebug("Collecting SFD servers data");
    const { totalPlayers, servers } = await DataCollector.getServers();
    const time = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    const rows = await Database.query<ResultSetHeader>("INSERT INTO log(timestamp) VALUES (?)", time);
    await Database.query<RowDataPacket[]>("INSERT INTO browser (total_players, total_servers, id_log) VALUES (?, ?, ?)", totalPlayers, servers.length, rows.insertId);
    for (const server of servers) {
      await Database.query<RowDataPacket[]>("INSERT INTO server (title, players, map, password, id_log, version) VALUES (?, ?, ?, ?, ?, ?)", server.GameName, server.Players, server.MapName, server.HasPassword, rows.insertId, server.Version);
    }
  }
}

interface ISFDServerData {
  AddressIPv4: string;
  AddressIPv6: string;
  LIP: string;
  Port: number;
  GameName: string;
  GameMode: number;
  MapName: string;
  Players: number;
  MaxPlayers: number;
  Bots: number;
  HasPassword: boolean;
  Description: string;
  Version: string;
  VersionNr: number;
  ApplicationInstance: string;
}

interface IPost {
  Title: string;
  Description: string;
}