const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);

const program = require('./program');

function clearFolder(folderPath)
{
    fs.readdirSync(folderPath).forEach((file) =>
    {
        fs.unlinkSync(path.join(folderPath, file));
    });
}

async function processImage(filePath, frameSize, fileExtname, mimeType)
{
    // Bild übernehmen
    const image = sharp(filePath);

    // Bild auf frameSize skalieren
    await image.resize(frameSize.width, frameSize.height);

    // program Ordner leeren
    clearFolder('./program');

    // Bild in program Ordner abspeichern
    await image.toFile(`./program/image${fileExtname}`);

    // Bild in program.m laden
    await program.load(mimeType);
}

async function processVideo(filePath, frameSize, mimeType)
{
    // program ordner leeren
    clearFolder('./program');

    // Video skalieren und in Bilder umwandeln
    await new Promise((resolve, reject) =>
    {
        var process = new ffmpeg(filePath);
        process.then((video) =>
        {
            video.fnExtractFrameToJPG('./program/', {
                frame_rate: video.metadata.video.fps,
                file_name: 'f',
                size: `${frameSize.width}x${frameSize.height}`,
                keep_aspect_ratio: false
            }, (error, files) =>
            {
                if (!error)
                {
                    resolve();
                } else
                {
                    reject(error);
                }
            });

        }, (err) =>
        {
            reject(err);
        });
    });

    // Bilder in program laden
    await program.load(mimeType);
}

async function processUpload(filePath, frameSize, mimeType, fileExtname)
{
    program.programHandler.enabled = false;

    if (mimeType.startsWith('image/'))
    {
        await processImage(filePath, frameSize, fileExtname, mimeType);
    }
    else if (mimeType.startsWith('video/'))
    {
        await processVideo(filePath, frameSize, mimeType);
    }
}

module.exports = {
    clearFolder,
    processUpload,
};