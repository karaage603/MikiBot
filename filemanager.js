const fs = require('fs');
const path = require('path');
const https = require('https');

const mediaFolder = './media';
let fileList = fs.existsSync(mediaFolder) ? fs.readdirSync(mediaFolder) : [];
let fileListNoExt = fileList.map(file => path.parse(file).name.toLowerCase());

const textFolder = './text';
let textList = fs.existsSync(textFolder) ? fs.readdirSync(textFolder) : [];
let textListNoExt = textList.map(file => path.parse(file).name.toLowerCase());

// Add new constant for metadata folder
const metaFolder = './metadata';

// Ensure metadata folder exists
if (!fs.existsSync(metaFolder)) {
    fs.mkdirSync(metaFolder);
}

// Check if bot has permission to post in channel
function botHasPermission(channel) {
    const botMember = channel.guild.members.cache.get(channel.client.user.id);
    if (!botMember) return false;

    return botMember.permissionsIn(channel).has([
        'ViewChannel',
        'SendMessages',
        'AttachFiles'
    ]);
}

////////// embed page function ////////////
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

async function listMedia(message) {
    if (!botHasPermission(message.channel)) return;
    const itemsPerPage = 15;
    const pages = Math.ceil(fileListNoExt.length / itemsPerPage);
    let currentPage = 0;

    // Create embed for current page

    const createEmbed = (page) => {
        const start = page * itemsPerPage;
        const end = Math.min(start + itemsPerPage, fileListNoExt.length);
        const pageFiles = fileListNoExt.slice(start, end);

        let description = pageFiles.join('\n') || 'No files available.';
        if (description.length > 4096) {
            description = description.slice(0, 4093) + '...';
        }

        return new EmbedBuilder()
            .setColor('#FFA600')
            .setTitle('MikiMedia')
            .setDescription(description)
            .setFooter({ text: `Page ${page + 1} of ${pages}` });
    };

    // Create navigation buttons
    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === pages - 1)
        );

    // Send initial message with embed and buttons
    const response = await message.channel.send({
        embeds: [createEmbed(currentPage)],
        components: [buttons]
    });

    // Create button collector
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // Collector will be active for 1 minute
    });

    collector.on('collect', async (interaction) => {
        // Update current page based on button pressed
        if (interaction.customId === 'prev') {
            currentPage = Math.max(0, currentPage - 1);
        } else if (interaction.customId === 'next') {
            currentPage = Math.min(pages - 1, currentPage + 1);
        }

        // Update button states
        buttons.components[0].setDisabled(currentPage === 0);
        buttons.components[1].setDisabled(currentPage === pages - 1);

        // Update the message with new embed and buttons
        await interaction.update({
            embeds: [createEmbed(currentPage)],
            components: [buttons]
        });
    });

    collector.on('end', () => {
        // Remove buttons when collector expires
        buttons.components.forEach(button => button.setDisabled(true));
        response.edit({ components: [buttons] }).catch(console.error);
    });
}

///////////////////////////////////////////

// Return the media file
function returnFile(message, args) {
    if (!botHasPermission(message.channel)) return;
    if ( args === 'back' ) {
      if (Math.random() > 0.5 ) args = 'front';
    }
    else if ( args === 'front' ) {
      if (Math.random() > 0.5 ) args = 'back';
    }
    const mediaIdx = fileListNoExt.indexOf(args);
    const mediaName = mediaIdx > -1 ? fileList[mediaIdx] : null;

    if (!mediaName) return;

    // Check for associated metadata file in metadata folder
    const baseName = path.parse(mediaName).name;
    const metadataPath = path.join(metaFolder, `${baseName}.meta`);
    let taggedUserId;

    if (fs.existsSync(metadataPath)) {
        taggedUserId = fs.readFileSync(metadataPath, 'utf8');
    }

    if (isTextFile(mediaName)) {
        // For text files, read content and check for embedded tag
        const content = fs.readFileSync(path.join(mediaFolder, mediaName), 'utf8');
        const tagMatch = content.match(/\[TAG:(\d+)\]$/);

        if (tagMatch) {
            taggedUserId = tagMatch[1];
            // Remove the tag before sending
            const cleanContent = content.replace(/\[TAG:\d+\]$/, '').trim();
            message.channel.send(cleanContent);
        } else {
            message.channel.send(content);
        }
    } else {
        // For other media, send as attachment
        message.channel.send({ files: [`${mediaFolder}/${mediaName}`] });
    }

    // Send silent ping if there's a tagged user
    if (taggedUserId) {
        message.channel.send({ content: `<@${taggedUserId}>`, flags: ['SuppressNotifications'] });
    }
}

// Update the file list
function updateFileList() {
    fileList = fs.readdirSync(mediaFolder);
    fileListNoExt = fileList.map(file => path.parse(file).name.toLowerCase());
}

// List all media files
function listMediaCommand(message) {
    if (!botHasPermission(message.channel)) return;
    message.channel.send(`These are the available media:\n${fileListNoExt.join('\n')}`);
}

// Add this function to check if a file is a text file
function isTextFile(filename) {
    return path.extname(filename).toLowerCase() === '.txt';
}

// Modify uploadCommand to use metadata folder
function uploadCommand(message, args) {
    if (!botHasPermission(message.channel)) return;
    if (!hasPermission(message)) return;

    // Find tag argument
    const tagIndex = args.findIndex(arg => arg.toLowerCase() === 'tag:');
    let userPreferredName, taggedUserId;

    if (tagIndex !== -1) {
        // Get name before tag
        userPreferredName = args[1]?.toLowerCase();
        // Extract user ID from mention format <@123456789>
        const mentionString = args[tagIndex + 1];
        taggedUserId = mentionString?.match(/<@!?(\d+)>/)?.[1];

        if (!userPreferredName || !taggedUserId) {
            message.channel.send("Please specify both a name and a valid user tag");
            return;
        }
    } else {
        userPreferredName = args[1]?.toLowerCase();
    }

    // Check if this is a text upload (no attachment)
    if (!message.attachments.size) {
        // Get the text content after the name and tag (if present)
        const textContent = tagIndex !== -1
            ? args.slice(2, tagIndex).join(' ')
            : args.slice(2).join(' ');

        if (!userPreferredName || !textContent) {
            message.channel.send("Please specify both a name and the text content");
            return;
        }

        const newFileName = `${userPreferredName}.txt`;
        const newFilePath = path.join(mediaFolder, newFileName);

        if (!fs.existsSync(mediaFolder)) {
            fs.mkdirSync(mediaFolder);
        }

        if (fs.existsSync(newFilePath)) {
            message.channel.send(`${newFileName} already exists. Please choose a different name.`);
            return;
        }

        // Store the tag with the content if provided
        const fileContent = taggedUserId
            ? `${textContent}\n[TAG:${taggedUserId}]`
            : textContent;

        fs.writeFileSync(newFilePath, fileContent, 'utf8');
        updateFileList();
        message.channel.send("Brainrot saved");
        return;
    }

    // Handle media upload
    if (!userPreferredName || message.author.bot || message.attachments.size === 0) {
        message.channel.send("Please specify a valid name and provide an attachment");
        return;
    }

    const attachment = message.attachments.first();
    const newFileName = `${userPreferredName}${path.extname(attachment.name)}`;
    const newFilePath = path.join(mediaFolder, newFileName);

    if (!fs.existsSync(mediaFolder)) {
        fs.mkdirSync(mediaFolder);
    }

    if (fs.existsSync(newFilePath)) {
        message.channel.send(`${newFileName} already exists. Please choose a different name.`);
        return;
    }

    // Create metadata file to store tag if provided
    if (taggedUserId) {
        if (!fs.existsSync(metaFolder)) {
            fs.mkdirSync(metaFolder);
        }
        const metadataPath = path.join(metaFolder, `${userPreferredName}.meta`);
        fs.writeFileSync(metadataPath, taggedUserId, 'utf8');
    }

    const file = fs.createWriteStream(newFilePath);
    https.get(attachment.url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            updateFileList();
            message.channel.send("Media saved");
        });
    });
}

// Modify renameCommand to also rename metadata
function renameCommand(message, args) {
    if (!botHasPermission(message.channel)) return;
    if (!hasPermission(message)) return;

    if (args.length < 3) {
        message.channel.send("Please specify both the old name and the new name.");
        return;
    }

    const oldName = args[1]?.toLowerCase();
    const newName = args[2]?.toLowerCase();

    const oldIdx = fileListNoExt.indexOf(oldName);
    if (oldIdx > -1) {
        const oldFile = fileList[oldIdx];
        const newFile = `${newName}${path.extname(oldFile)}`;
        const oldFilePath = path.join(mediaFolder, oldFile);
        const newFilePath = path.join(mediaFolder, newFile);

        if (fs.existsSync(newFilePath)) {
            message.channel.send(`${newFile} already exists. Please choose a different new name.`);
            return;
        }

        // Rename the main file
        fs.renameSync(oldFilePath, newFilePath);

        // Rename metadata file if it exists
        const oldMetaPath = path.join(metaFolder, `${oldName}.meta`);
        const newMetaPath = path.join(metaFolder, `${newName}.meta`);
        if (fs.existsSync(oldMetaPath)) {
            fs.renameSync(oldMetaPath, newMetaPath);
        }

        updateFileList();
        message.channel.send(`File renamed from ${oldFile} to ${newFile}`);
    } else {
        message.channel.send(`${oldName} not found.`);
    }
}

function deleteCommand(message, args) {
    if (!botHasPermission(message.channel)) return;
    if (!hasPermission(message)) return;

    const fileNameToDelete = args[1]?.toLowerCase();
    const fileToDeleteIdx = fileListNoExt.indexOf(fileNameToDelete);
    const fileToDelete = fileToDeleteIdx > -1 ? fileList[fileToDeleteIdx] : null;

    if (!fileToDelete) {
        message.channel.send(`${fileNameToDelete} not found.`);
        return;
    }

    // Delete the main file
    fs.unlinkSync(path.join(mediaFolder, fileToDelete));

    // Delete associated metadata file if it exists
    const metadataPath = path.join(metaFolder, `${path.parse(fileToDelete).name}.meta`);
    if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
    }

    updateFileList();
    message.channel.send(`${fileToDelete} has been successfully deleted.`);
}

// Permission check function
function hasPermission(message) {
    if (message.member?.permissions.has('ManageMessages')) {
        return true;
    }
    return false;
}

// Update the text list
function updateTextList() {
    textList = fs.readdirSync(textFolder);
    textListNoExt = textList.map(file => path.parse(file).name.toLowerCase());
}

// Upload text content
function uploadTextCommand(message, args) {
    if (!botHasPermission(message.channel)) return;
    if (!hasPermission(message)) return;

    const textName = args[1]?.toLowerCase();
    const textContent = args.slice(2).join(' ');

    if (!textName || !textContent) {
        message.channel.send("Please specify both a name and the text content");
        return;
    }

    if (!fs.existsSync(textFolder)) {
        fs.mkdirSync(textFolder);
    }

    const filePath = path.join(textFolder, `${textName}.txt`);

    if (fs.existsSync(filePath)) {
        message.channel.send(`${textName} already exists. Please choose a different name.`);
        return;
    }

    fs.writeFileSync(filePath, textContent, 'utf8');
    updateTextList();
    message.channel.send(`Uploaded text brainrot as ${textName}"`);
}

// Return the text content
function returnText(message, args) {
    if (!botHasPermission(message.channel)) return;
    const textIdx = textListNoExt.indexOf(args);
    if (textIdx > -1) {
        const textPath = path.join(textFolder, `${textList[textIdx]}`);
        const content = fs.readFileSync(textPath, 'utf8');
        message.channel.send(content);
    }
}

module.exports = {
    returnFile,
    listMediaCommand,
    uploadCommand,
    renameCommand,
    deleteCommand,
    botHasPermission,
    listMedia,
    uploadTextCommand,
    returnText,
    hasPermission
};
