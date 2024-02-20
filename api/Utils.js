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

const filterNewRecords = (rawData, newRecord) => {
    // Parse CSV data into an array of objects
    // Split the CSV data into rows
    const rows = rawData.split('\n');

    // Extract the header row
    const header = rows[0].split(',');

    // Find the index of ASSET_ID column
    const assetIdIndex = header.indexOf('ASSET_ID');

    // Filter rows based on ASSET_ID column value
    const filteredRows = rows.filter((row, index) => {
        if (index === 0) return true; // Include header row
        const columns = row.split(',');
        return newRecord ? columns[assetIdIndex] === 'NEW' : columns[assetIdIndex] !== 'NEW';
    });

    // Join the filtered rows back into CSV format
    const filteredData = filteredRows.join('\n');

    return filteredData;
}

const objectToCSV = (obj, mapping) => {
    var mappedFields = Object.values(mapping);

    // Constructing CSV header based on the mapped fields
    var csv = mappedFields.join(",") + "\n";

    // Generating CSV rows
    obj.forEach(item => {
        csv += mappedFields.map(field => item[field]).join(",") + "\n";
    });

    return csv;
}

export {
    filterNewRecords,
    getScriptPromisify,
    getStylesheetPromisify,
    generateAutoId,
    objectToCSV
}