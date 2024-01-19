const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Definition der Beispielbilder
const images = [
    {
        color: 'red',
        count: 20
    },
    {
        color: 'blue',
        count: 20
    },
    {
        color: 'green',
        count: 20
    },
    {
        color: 'purple',
        count: 20
    },
    {
        color: 'yellow',
        count: 20
    }
];

function createColoredImages(images)
{
    const programFolder = './program';

    // Programm Ordner erstellen, falls nicht vorhanden
    if (!fs.existsSync(programFolder))
    {
        fs.mkdirSync(programFolder);
    }

    // Programm Ordner leeren
    fs.readdirSync(programFolder).forEach((file) =>
    {
        fs.unlinkSync(path.join(programFolder, file));
    });

    images.forEach((image, index) =>
    {
        for (let i = 0; i < image.count; i++)
        {
            const fileName = `${programFolder}/${index * image.count + i + 1}.png`;

            const sharpImage = sharp({
                create: {
                    width: config.animation.frameSize.width,
                    height: config.animation.frameSize.height,
                    channels: 3,
                    background: image.color
                }
            });

            sharpImage.png().toFile(fileName)
                .then(() => console.log(`Bild ${fileName} erstellt.`))
                .catch(err => console.error(err));
        }
    });
}

// Einstiegspunkt
createColoredImages(images);
