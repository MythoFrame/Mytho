import "chartjs-adapter-date-fns";
import moment from "moment";
import Canvas from "canvas";
import Chart from "chart.js";
import { writeFile } from "node:fs/promises";
import { CommandInteraction } from "discord.js";
import { Discord, Slash, SlashChoice, SlashOption } from "discordx";
import { RowDataPacket } from "mysql2/promise";
import { Database } from "../utils/data.js";
import { Category } from "@discordx/utilities";
import { InteractionUtils } from "../utils/interaction.js";

@Discord()
@Category("SFD Commands")
abstract class PlayerActivity {
    @Slash("player-activity", { description: "Generate a chart of players and servers activty" })
    private async playerActivity(
        @SlashChoice({ name: "Day", value: 24 })
        @SlashChoice({ name: "Week", value: 128 })
        @SlashChoice({ name: "Month", value: 720 })
        @SlashChoice({ name: "All", value: -1 })
        @SlashOption("range", { description: "How much" })
        range: number,
        interaction: CommandInteraction
    ): Promise<void> {
        await interaction.deferReply();
        let minimal = 0;
        let div = Math.ceil(range / 5) * 60;
        if (!(range === undefined || range === -1)) minimal = Date.now() - range * 3600000;
        if (range > 128 || (range === undefined || range === -1)) div = 24 * 60 * 60;

        let fromTime = moment(minimal).format("YYYY-MM-DD HH:mm:ss");

        const rows = await Database.query<RowDataPacket[]>(
            `SELECT timestamp, AVG(total_players) as players, AVG(total_servers) as servers FROM browser JOIN log ON id_log = log.id WHERE timestamp > '${fromTime}' GROUP BY UNIX_TIMESTAMP(timestamp) DIV ${div};`,
        );

        await this.createChart(rows);
        await InteractionUtils.replyOrFollowUp(interaction, {
            files: ["./activity.png"],
        });
    }

    private async createChart(playerActivity: RowDataPacket[]): Promise<void> {
        const playerData = [];
        const serverData = [];

        
        for (const point of playerActivity) {
          playerData.push({ x: point.timestamp, y: Math.floor(point.players) });
          serverData.push({ x: point.timestamp, y: Math.floor(point.servers) });
        }

        const image = Canvas.createCanvas(1200, 800);
        new Chart.Chart(image.getContext("2d"), {
            type: "line",
            data: {
                datasets: [
                    {
                        label: "Players",
                        data: playerData,
                        fill: true,
                        borderColor: "rgb(223, 203, 120)",
                        backgroundColor: "rgba(223, 203, 120, 0.3)",
                        tension: 0.1,
                        borderWidth: 1,
                        pointRadius: 0,
                    },
                    {
                        label: "Servers",
                        data: serverData,
                        fill: true,
                        borderColor: "rgb(255, 255, 255)",
                        backgroundColor: "rgba(255, 255, 255, 0.3)",
                        borderDash: [3, 3],
                        tension: 0.1,
                        borderWidth: 1,
                        pointRadius: 0,
                    },
                ],
            },
            options: {
                parsing: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(255, 255, 255, 0.3)",
                        },
                    },
                    x: {
                        grid: {
                            color: "rgba(255, 255, 255, 0.3)",
                        },
                        type: "time",
                        min: playerData[0].x,
                        max: playerData[playerData.length - 1].x,
                        ticks: {
                            source: "auto",
                            maxRotation: 0,
                            autoSkip: true,
                        },
                    },
                },
            },
            plugins: [
                {
                    id: "custom_canvas_background_color",
                    beforeDraw: (chart) => {
                        const ctx: CanvasRenderingContext2D = chart.canvas.getContext("2d")!;
                        ctx.save();
                        ctx.globalCompositeOperation = "destination-over";
                        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                        ctx.fillRect(0, 0, chart.width, chart.height);
                        ctx.restore();
                    },
                },
            ],
        });

        const buffer = image.toBuffer("image/png");
        await writeFile("./activity.png", buffer);
    }
}
