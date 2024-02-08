const getScriptPromisify = (src) => {
    var script = document.createElement('script');
    script.src = src;
    document.head.appendChild(script);
}

const getStylesheetPromisify = (href) => {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

const generateAutoId = (dataObject, numberOfIdNeed, prefix = '') => {
    // Extract numeric part of the latest ID and convert it to a number
    const latestId = dataObject.value.reduce((maxId, item) => {
        const idNumber = parseInt(item.ID.replace(/[^0-9]/g, ''), 10);
        return idNumber > maxId ? idNumber : maxId;
    }, 0);

    // Generate new IDs based on the latest ID
    const newIds = Array.from({ length: numberOfIdNeed }, (_, index) => {
        const newIdNumber = latestId + index + 1;
        const newId = `${prefix}${newIdNumber.toString().padStart((10 - prefix.length), '0')}`;
        return newId;
    });

    return newIds;
}


const updateAssetIds = (mapping, csvRaw, replaceToColumn) => {
    // Parse CSV and convert it into an array of objects
    var csvArray = csvRaw.split('\n').map(row => row.split(','));

    // Find the index of "ASSET_ID" column
    var assetIndex = csvArray[0].indexOf(replaceToColumn);

    // Update the "ASSET_ID" values with corresponding "AUTOID" values
    for (var i = 1; i < csvArray.length; i++) {
        var assetValue = csvArray[i][assetIndex];
        var mappingEntry = mapping.find(entry => entry.asset_id === assetValue);
        if (mappingEntry.AUTOID && mappingEntry) {
            csvArray[i][assetIndex] = mappingEntry.AUTOID;
        }
    }

    // Convert the array of arrays back to CSV format
    var updatedCsvRaw = csvArray.map(row => row.join(',')).join('\n');

    return updatedCsvRaw;
}

export {
    getScriptPromisify,
    getStylesheetPromisify,
    generateAutoId,
    updateAssetIds
}