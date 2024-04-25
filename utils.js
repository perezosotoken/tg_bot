const fs = require('fs').promises; // Use the promises version of fs

const path = "/root/tg_bot/server/data/";

// Function to generate a random alphanumeric code of a given length
function generateCode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Function to generate an array of n random codes
function generateMultipleCodes(n, codeLength) {
    const codes = [];
    for (let i = 0; i < n; i++) {
        codes.push(generateCode(codeLength));
    }
    return codes;
}

function saveCodesToJsonFile(codes, communityName, influencerAddress) {
    const codesObject = {}; // Create an empty object
    codesObject[`${communityName}:${influencerAddress}`] = {}; // Include influencer address in the key

    codes.forEach((code, index) => {
        codesObject[`${communityName}:${influencerAddress}`][index] = code; // Use the updated key
    });

    fs.writeFile(`${path}${communityName}.json`, JSON.stringify(codesObject, null, 4), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log('Codes saved to', `${communityName}.json`);
        }
    });
}

async function searchForCode(code, communityName) {
    try {
        const data = await fs.readFile(`${path}${communityName}.json`, { encoding: 'utf8' });
        const codesObject = JSON.parse(data);

        console.log('Codes Object:', codesObject); // Log the entire codes object

        let found = false;
        let foundIndex = -1;
        let influencerAddress = '';

        // Extracting the first key from the codesObject
        const firstKey = Object.keys(codesObject)[0];

        console.log('First Key:', firstKey);

        // Splitting communityName into community name and influencer address
        const [parsedCommunityName, parsedInfluencerAddress] = firstKey.split(':');

        console.log('Parsed Community Name:', parsedCommunityName);
        console.log('Parsed Influencer Address:', parsedInfluencerAddress);

        // Check if the community exists in the codesObject
        if (codesObject[firstKey]) {
            // Loop through the codes in the community
            for (const key in codesObject[firstKey]) {
                if (codesObject[firstKey][key] === code) {
                    console.log(`Code found in '${firstKey}' with index ${key}`);
                    found = true;
                    foundIndex = parseInt(key); // Convert key to integer
                    influencerAddress = parsedInfluencerAddress;
                    break; // Exit loop once code is found
                }
            }
        }

        return { found, foundIndex, influencerAddress };
    } catch (err) {
        console.error("Error reading the file:", err);
        return { found: false, foundIndex: -1, influencerAddress: '' };
    }
}


async function removeCodeFromList(communityName, index, influencerAddress) {
    try {
        const data = await fs.readFile(`${path}${communityName}.json`, { encoding: 'utf8' });
        const codesObject = JSON.parse(data);
  
        // Parse community name and influencer address from the key
        const [parsedCommunityName, parsedInfluencerAddress] = communityName.split(':');
  
        // Check if the community exists in the codesObject
        if (codesObject[communityName]) {
            // Loop through the codes in the community
            for (const key in codesObject[communityName]) {
                if (parseInt(key) === index) {
                    delete codesObject[communityName][key];
                    break; // Exit loop once code is removed
                }
            }
        }
  
        await fs.writeFile(`${path}${communityName}.json`, JSON.stringify(codesObject, null, 2));
        console.log(`Code removed from list in ${communityName} at index ${index} for influencer ${influencerAddress}`);
    } catch (err) {
        console.error("Error removing code from list:", err);
    }
}

  async function populateAuthData() {
    try {
        const data = await fs.readFile(`${path}appData.json`, { encoding: 'utf8' });
        const jsonData = JSON.parse(data);
        let authData = {};
        
        for (const key in jsonData) {
            if (jsonData.hasOwnProperty(key)) {
                const username = key;
                const tokens = jsonData[key];
                
                // Set authData for the username
                authData[username] = {
                    tokens: tokens,
                    authenticated: true // You can set other properties as needed
                };
            }
        }

        console.log('Auth data populated successfully:', authData);

        return authData;
    } catch (error) {
        console.error('Error populating auth data:', error);
        return null;
    }
}

module.exports = {
    generateCode,
    searchForCode,
    generateMultipleCodes,
    saveCodesToJsonFile,
    removeCodeFromList,
    populateAuthData
};