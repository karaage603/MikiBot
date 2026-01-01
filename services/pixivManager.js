async function getPhixivIllustCount(url, axios, cheerio) {
  try {
    let count = 1;
    let previousOgImage = '';
    const uniqueUrls = new Map(); // Track unique URLs and their og:image
    // Keep trying next number until a duplicate og:image
    while (count < 50) {
      try {
        const testUrl = count === 1 ? url : `${url}/${count}`;
        const response = await axios.get(testUrl);

        // Load the HTML content
        const $ = cheerio.load(response.data);

        // Get the og:image meta tag content
        const ogImage = $('meta[property="og:image"]').attr('content');

        // if (ogImage === previousOgImage) {
        //   console.log('Found duplicate og:image, stopping at count:', count - 1);
        //   break;
        // }

        uniqueUrls.set(ogImage, testUrl);
        previousOgImage = ogImage;
        count++;
      } catch (error) {
        break;
      }
    }

    return Array.from(uniqueUrls.values());
  } catch (error) {
    console.error('Error in getPhixivIllustCount:', error);
    return [url];
  }
}

async function handlePhixivLinks(message, newUrl, maxLinkCount, axios, cheerio) {
  let spoilerFlag = false;
  if (message.content.includes('||')) {
    spoilerFlag = true;
  }

  try {
    const uniqueUrls = await getPhixivIllustCount(newUrl, axios, cheerio);

    await message.suppressEmbeds(true);
    for (let i = 0; i < uniqueUrls.length; i++) {
      if (spoilerFlag) await message.channel.send('|| ' + uniqueUrls[i] + ' ||');
      else await message.channel.send(uniqueUrls[i]);
      if (i < uniqueUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    if (uniqueUrls.length >= maxLinkCount) {
      await message.channel.send("Stopping at limit");
    }
  } catch (error) {
    // console.error('Error handling phixiv links:', error);
  }
}

async function handlePhixivLinksNotBot(message, newUrl, maxLinkCount, axios, cheerio) {
  let spoilerFlag = false;
  if (message.content.includes('||')) {
    spoilerFlag = true;
  }

  try {
    const uniqueUrls = await getPhixivIllustCount(newUrl, axios, cheerio);

    for (let i = 0; i < uniqueUrls.length; i++) {
      if (spoilerFlag) await message.channel.send('|| ' + uniqueUrls[i] + ' ||');
      else await message.channel.send(uniqueUrls[i]);
      if (i < uniqueUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (uniqueUrls.length >= maxLinkCount) {
      await message.channel.send("Stopping at limit");
    }
  } catch (error) {
    // console.error('Error handling phixiv links:', error);
  }
}

module.exports = { handlePhixivLinks, handlePhixivLinksNotBot };