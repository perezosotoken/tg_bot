const fs = require('fs');

const path = "/home/binyu/Desktop/code/Perezoso/PerezosoTokenBot/server/data/";

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

// Function to save the generated codes to a JSON file with a specific structure
function saveCodesToJsonFile(codes, communityName) {
    const codesObject = {}; // Create an empty object
    codesObject[communityName] = {}; // Use bracket notation to use the variable as a key

    codes.forEach((code, index) => {
        codesObject[communityName][index] = code; // Correctly use communityName here
    });

    fs.writeFile(`${path}${communityName}.json`, JSON.stringify(codesObject, null, 4), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log('Codes saved to', `${communityName}.json`);
        }
    });
}

// Function to search for a code in the JSON file
function searchForCode(code, communityName) {
    fs.readFile(`${path}${communityName}.json`, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading the file:", err);
            return;
        }

        const codesObject = JSON.parse(data);
        let found = false;

        // Assuming the structure is { "CommunityName": { "0": "code", "1": "code", ... } }
        for (const community in codesObject) {
            for (const key in codesObject[community]) {
                if (codesObject[community][key] === code) {
                    console.log(`Code found in '${community}' with index ${key}`);
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            console.log("Code not found.");
        }
    });
}

module.exports = {
    generateCode,
    searchForCode,
    generateMultipleCodes,
    saveCodesToJsonFile
};