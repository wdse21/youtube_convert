import express from "express";
import yotubeconvert from "youtube-dl-exec";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import cors from "cors";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3111"],
    credential: true,
  })
);

app.listen(port, () => {
  console.log(port, "서버로 구동 중.");
});

// Youtube MP3로 다운로드
app.get("/mp3/download", async (req, res) => {
  try {
    const { youtubeUrl } = req.query;

    const trim = youtubeUrl.trim();

    if (!trim) {
      return res.status(400).json({ message: "YouTube URL이 필요합니다." });
    }

    const tempName = "tempdownload.mp3";
    const outputName = "download.mp3";

    const { tempPath, outputPath } = readPath(tempName, outputName);

    console.log("----- convert start -----\n");
    await yotubeconvert(trim, {
      extractAudio: true,
      audioFormat: "mp3",
      output: tempPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    }).then((output) => console.log(output));
    console.log("\n----- convert end -----");

    console.log("----- processing start -----\n");
    await new Promise((resolve, reject) => {
      const ffmpegCommand = `ffmpeg -i "${tempPath}" -b:a 320k "${outputPath}"`;
      exec(ffmpegCommand, (err, stdout, stderr) => {
        if (err) {
          console.error("변환 오류 발생 : ", err);
          reject(err);
        } else {
          console.log("변환 성공 : ", stdout || stderr);
          resolve();
        }
      });
    });

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ message: "MP3 파일 생성 실패" });
    }

    console.log("\n----- processing end -----");
    return res.status(201).json({ message: "MP3 파일로 변환 성공!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "MP3로 변환 실패" });
  } finally {
    const tempName = "tempdownload.mp3";

    const { tempPath } = readPath(tempName);

    // 변환 전 파일 삭제
    fs.unlinkSync(tempPath);
  }
});

// Youtube MP4로 다운로드
app.get("/mp4/download", async (req, res) => {
  try {
    const { youtubeUrl } = req.query;

    const trim = youtubeUrl.trim();

    if (!trim) {
      return res.status(400).json({ message: "YouTube URL이 필요합니다." });
    }

    const tempName = "tempdownload.webm";
    const outputName = "download.mp4";

    const { tempPath, outputPath } = readPath(tempName, outputName);

    console.log("----- convert start -----\n");
    await yotubeconvert(trim, {
      format: "bestvideo[height<=1080]+bestaudio/best",
      output: tempPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    }).then((output) => console.log(output));
    console.log("\n----- convert end -----");

    console.log("----- processing start -----\n");
    await new Promise((resolve, reject) => {
      const ffmpegCommand = `ffmpeg -i "${tempPath}" -c:v libx264 -c:a aac -strict experimental -b:a 320k "${outputPath}"`;
      exec(ffmpegCommand, (err, stdout, stderr) => {
        if (err) {
          console.error("변환 오류 발생 : ", err);
          reject(err);
        } else {
          console.log("변환 성공 : ", stdout || stderr);
          resolve();
        }
      });
    });

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ message: "MP4 파일 생성 실패" });
    }

    console.log("\n----- processing end -----");
    return res.status(201).json({ message: "MP4 파일로 변환 성공!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "MP4로 변환 실패" });
  } finally {
    const tempName = "tempdownload.webm";

    const { tempPath } = readPath(tempName, null);

    // 변환 전 파일 삭제
    fs.unlinkSync(tempPath);
  }
});

// 파일 경로 read
function readPath(tempName, outputName) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const tempPath = path.resolve(__dirname, tempName.trim());
  const outputPath = outputName
    ? path.resolve(__dirname, outputName.trim())
    : null;

  return { tempPath, outputPath };
}
