import { StoryTemplate } from "../template/StoryTemplate";
import { FileLoad } from "../api/FileLoad";
import { getScriptPromisify, generateAutoId, updateAssetIds } from "../api/Utils";

getScriptPromisify('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.16.9/xlsx.full.min.js');

const template = document.createElement("template");
template.innerHTML = StoryTemplate;

class WBDPlanning extends HTMLElement {
    fileLoad = new FileLoad();

    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: "open" });

        this._shadowRoot.appendChild(template.content.cloneNode(true));
        this._props = {};
        this._fileInput = this._shadowRoot.querySelector("#file-input");
        this._uploadingDiv = this._shadowRoot.querySelector("#uploading");
        this._typeSelect = this._shadowRoot.querySelector("#type-select");
        this._mainBox = this._shadowRoot.querySelector("#main-box");

        // this._fileInput.addEventListener("click", () => this.clearFileInput());
        this._fileInput.addEventListener("change", () => this.handleFileSelect()); //file select
        this._typeSelect.addEventListener("change", () => this.handleUpload()); //select option

        this._generatedId;
        this._assetList;
        this._rawsData;
        this._autoIdType = false;
        this._autoIdList;
        this._csvData;

        this.displayLoadingState();
    }

    //Selecting file from Input
    async handleFileSelect() {
        const file = this._fileInput.files[0];
        const data = await this.readFileAsync(file);
        const workbook = XLSX.read(data, { type: 'array' });
        this.populateSheetNames(workbook);
        this.handleUpload();
    }

    //Selecting options
    async handleUpload() {
        const file = this._fileInput.files[0];
        const data = await this.readFileAsync(file);
        const workbook = XLSX.read(data, { type: 'array' });

        const selectedSheetIndex = parseInt(this._typeSelect.value) ?? 0;

        if (isNaN(selectedSheetIndex) || selectedSheetIndex < 0 || selectedSheetIndex >= workbook.SheetNames.length) {
            alert('Invalid sheet selection');
            return;
        }

        const selectedSheetName = workbook.SheetNames[selectedSheetIndex];
        const sheet = workbook.Sheets[selectedSheetName];

        const rows = this.processSheet(sheet);
        this._rawsData = rows;
    }

    async readFileAsync(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(new Uint8Array(event.target.result));
            reader.onerror = (event) => reject(event.error);
            reader.readAsArrayBuffer(file);
        });
    }

    populateSheetNames(workbook) {
        this._typeSelect.style.display = "block";
        for (let i = 0; i < workbook.SheetNames.length; i++) {
            const option = document.createElement("option");
            option.value = i;
            option.textContent = workbook.SheetNames[i];
            this._typeSelect.appendChild(option);
        }
    }

    filterFactData(rawData, mapping) {
        var rows = rawData.split('\n');
        var header = rows[0].split(',');
        var selectedIndices = Object.values(mapping).map(value => header.indexOf(value));
        var filteredRows = rows.map(row => {
            var columns = row.split(',');
            var selectedColumns = selectedIndices.map(index => columns[index] || ''); // handle empty values
            return selectedColumns.join(',');
        });

        return filteredRows.join('\n');
    }

    async clearFileInput() {
        try {
            this._fileInput.value = null;
        } catch (ex) { }
        if (this._fileInput.value) {
            this._fileInput.parentNode.replaceChild(this._fileInput.cloneNode(true), this._fileInput);
        }
        this._typeSelect.innerHTML = "";
        this._typeSelect.style.display = "none";
    }

    displayLoadingState() {
        this._mainBox.style.display = "none";
        this._uploadingDiv.style.display = "block";
    }

    displayNormalState() {
        if (this._fileInput.files[0]) {
            this._fileInput.style.display = "block";
        }
        this._mainBox.style.display = "block";
        this._uploadingDiv.style.display = "none";
    }

    processSheet(sheet) {
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headers = sheetData[0];
        const dataRows = sheetData.slice(1);
        return `${headers.join(',')}\n${dataRows.map(row => row.join(',')).join('\n')}`;
    }

    async connectedCallback() {
        await this.fileLoad.initialize().then(() => {
            this.displayNormalState();
        });
    }

    async uploadData() {
        const rawData = this._rawsData;
        const model = this._props.modelId;
        const jobType = 'factData'; //factData, masterData, masterFactData
        const mappingSelection = this._props.dataMapping || {};
        const defaultSelection = this._props.dataDefaultValues || {};

        const mapping = {
            "Mapping": mappingSelection,
            "DefaultValues": defaultSelection,
            "JobSettings": {}
        };

        // console.log("rawdata");
        // console.log(rawData);

        // console.log("mapping");
        // console.log(mappingSelection);
        const factRawData = this.filterFactData(rawData, mappingSelection);

        // console.log("factRawData");
        // console.log(factRawData);
        //Updated on 01-FEB-2024 Time 9:20 AM
        const replaceData = updateAssetIds(this._csvData, factRawData, this._props.dataMapping.DIM_ASSET);
        //const replaceData = updateAssetIds(this._csvData, factRawData, "DIM_ASSET");
        this.displayLoadingState();

        // console.log("replacedData");
        // console.log(replaceData);
        const status = await this.fileLoad.createJob(model, jobType, mapping, replaceData);

        this.displayNormalState();
        if (status) {
            return true;
        } else {
            return false;
        }

    }
    /* Json based Functions*/

    async setAutoId(type) {
        this._autoIdType = type;
    }

    async getAssetAutoId(limit, prefix) {
        const assetList = await this.fileLoad.getApiData(this._props.modelId, 'DIM_ASSET', prefix);
        this._autoIdList = generateAutoId(assetList, limit, prefix);
        return this._autoIdList;
    }

    async getProjectAutoId(limit, prefix) {
        const projectList = await this.fileLoad.getApiData(this._props.modelId, 'DIM_PROJECT', prefix);
        return generateAutoId(projectList, limit, prefix);
    }

    async getMasterData(dimensionId, filters) {
        const masterData = await this.fileLoad.getMasterDataAPI(this._props.modelId, dimensionId, filters);
        return masterData;
    }

    /*

    async parseCSV() {
        const rawsData = this._rawsData;
        var autoIdStartFrom = ''; // Use await here
        const autoIdType = this._autoIdType;
        if (autoIdType) {
            autoIdStartFrom = (await this.getAssetAutoId(1, 'PA'))[0];
        }
        const rows = rawsData.split('\n');
        const headers = rows[0].split(',');

        const data = [];
        let autoIdCounter = autoIdType && autoIdStartFrom ? parseInt(autoIdStartFrom.match(/\d+$/)[0]) : null;

        autoIdCounter = autoIdCounter - autoIdCounter;

        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].split(',');
            const entry = {};

            if (autoIdType && autoIdStartFrom) {
                const prefix = autoIdStartFrom.replace(/\d+$/, '');
                const lastNumericPart = autoIdStartFrom.match(/\d+$/)[0];
                const incrementedId = String(parseInt(lastNumericPart) + autoIdCounter).padStart(lastNumericPart.length, '0');
                entry.AUTOID = `${prefix}${incrementedId}`;
                autoIdCounter++;
            }

            for (let j = 0; j < headers.length; j++) {
                entry[headers[j].toLowerCase()] = values[j] ?? '';
            }

            //AR & PA CODE
            if (autoIdType && autoIdStartFrom) {
                if (
                    entry[this._props.dataMapping.DIM_PROJECT.toLowerCase()] &&
                    entry[this._props.dataMapping.DIM_PROJECT.toLowerCase()].startsWith("DL")
                ) {
                    entry["AUTOID"] = entry["AUTOID"].replace("PA", "AR");
                }
            }
            //AR & PA CODE

            data.push(entry);
        }

        this._csvData = data;
        // this.clearFileInput();
        return data;
    }
    */

    async parseCSV() {
        var rawData = this._rawsData;
        var projectLastIdPA = (await this.fileLoad.getApiData(this._props.modelId, 'DIM_ASSET', 'PA')).value[0].ID;
        var projectLastIdAR = (await this.fileLoad.getApiData(this._props.modelId, 'DIM_ASSET', 'AR')).value[0].ID; //await this.fileLoad.getApiData(this._props.modelId, 'DIM_ASSET', 'AR').value[0].ID;
        var projectColumnName = this._props.dataMapping.DIM_PROJECT; //"PROJECT ID";
        var isAutoId = this._autoIdType;

        // Parse the CSV data into an array of objects
        var lines = rawData.split("\n");
        var headers = lines[0].split(",");
        var result = [];

        for (var i = 1; i < lines.length; i++) {
            var obj = {};
            var currentLine = lines[i].split(",");

            for (var j = 0; j < headers.length; j++) {
                obj[headers[j].toLowerCase()] = currentLine[j] ?? '';
            }

            // Generate AUTOID based on PROJECT ID
            var autoIdPrefix = currentLine[headers.indexOf(projectColumnName)].substring(0, 2) === 'PP' ? 'PA' : 'AR';
            var nextAutoId = autoIdPrefix === 'PA' ? parseInt(projectLastIdPA.substring(2)) + 1 : parseInt(projectLastIdAR.substring(2)) + 1;
            var autoId = autoIdPrefix + nextAutoId.toString().padStart(8, '0');

            // Update projectLastId based on the generated AUTOID
            if (autoIdPrefix === 'PA') {
                projectLastIdPA = autoId;
            } else {
                projectLastIdAR = autoId;
            }

            // Add AUTOID to the object
            if (isAutoId) {
                obj['AUTOID'] = autoId;
            }

            result.push(obj);
        }

        this._csvData = result;
        return result;
    }


    /* Json based Functions*/

    onCustomWidgetBeforeUpdate(changedProperties) {
        this._props = { ...this._props, ...changedProperties };
    }

    onCustomWidgetAfterUpdate(changedProperties) {

    }
}

customElements.define("com-rohitchouhan-wbdplanning", WBDPlanning);