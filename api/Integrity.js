const fs = require('fs');
const crypto = require('crypto');

const filePath = 'dist/WBDPlanning.bundle.js';
const jsonFilePath = 'WBDPlanning.json';

// Read the existing JSON file
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

// Read the file content
const fileContent = fs.readFileSync(filePath);

// Generate SHA-256 hash
const sha256Hash = crypto.createHash('sha256').update(fileContent).digest('base64');

// Update the integrity field in the JSON
jsonData.webcomponents[0].integrity = 'sha256-' + sha256Hash;

// Convert the updated JSON object to a string with indentation
const jsonString = JSON.stringify(jsonData, null, 2);

// Write the updated JSON back to the file
fs.writeFileSync(jsonFilePath, jsonString);

console.log('Integrity updated successfully.');
