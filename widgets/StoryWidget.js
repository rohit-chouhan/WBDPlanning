import { StoryTemplate } from "../template/StoryTemplate";
import { FileLoad } from "../api/FileLoad";
import { getScriptPromisify, generateAutoId, objectToCSV, filterNewRecords } from "../api/Utils";

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

        this._fileInput.addEventListener("click", () => this.clearFileInput());
        this._fileInput.addEventListener("change", () => this.handleFileSelect()); //file select
        this._typeSelect.addEventListener("change", () => this.handleUpload()); //select option

        this._rawsData;
        this._autoIdType = false;
        this._autoIdList;
        this._csvData = null;
        this._csvNewData = null;
        this._csvExistData = null;

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
        const model = this._props.modelId;
        const jobType = 'factData'; //factData, masterData, masterFactData
        const mappingSelection = this._props.dataMapping || {};
        const defaultSelection = this._props.dataDefaultValues || {};

        const mapping = {
            "Mapping": mappingSelection,
            "DefaultValues": defaultSelection,
            "JobSettings": {
                "executeWithFailedRows": true
            }
        };

        this._csvData = this._csvNewData.concat(this._csvExistData);

        const factRawData = objectToCSV(this._csvData, mappingSelection);

        const status = await this.fileLoad.createJob(model, jobType, mapping, factRawData);

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


    //Return Excel data as OBJECT, supported with AutoId true and false
    async parseCSV() {
        const isAutoId = this._autoIdType || false;
        const rawData = this._rawsData;
        let projectLastIdPA = "";
        let projectLastIdAR = "";
        let projectColumnName = "";

        if (isAutoId) {
            const assetDataPA = await this.fileLoad.getApiData(this._props.modelId, 'DIM_ASSET', 'PA');
            const assetDataAR = await this.fileLoad.getApiData(this._props.modelId, 'DIM_ASSET', 'AR');
            projectLastIdPA = assetDataPA?.value[0]?.ID || "";
            projectLastIdAR = assetDataAR?.value[0]?.ID || "";
            projectColumnName = this._props.dataMapping?.DIM_PROJECT || "";
        }

        const lines = rawData.split("\n");
        const headers = lines[0].split(",");
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentLine = lines[i].split(",");

            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j] || '';
            }

            if (isAutoId) {
                const columnIndex = headers.indexOf(projectColumnName);
                const autoIdPrefix = currentLine[columnIndex]?.substring(0, 2) === 'PP' ? 'PA' : 'AR';
                const nextAutoId = autoIdPrefix === 'PA' ? parseInt(projectLastIdPA.substring(2)) + 1 : parseInt(projectLastIdAR.substring(2)) + 1;
                const autoId = autoIdPrefix + nextAutoId.toString().padStart(8, '0');

                if (autoIdPrefix === 'PA') {
                    projectLastIdPA = autoId;
                } else {
                    projectLastIdAR = autoId;
                }

                obj['AUTOID'] = autoId;
            }

            result.push(obj);
        }

        return result;
    }


    //Return only NEW one Assets
    async parseNewAssetCSV() {
        const isAutoId = true;
        const rawData = filterNewRecords(this._rawsData, true);
        let projectLastIdPA = "";
        let projectLastIdAR = "";
        let projectColumnName = "";

        if (isAutoId) {
            const assetDataPA = await this.fileLoad.getApiData(this._props.modelId, 'DIM_ASSET', 'PA');
            const assetDataAR = await this.fileLoad.getApiData(this._props.modelId, 'DIM_ASSET', 'AR');
            projectLastIdPA = assetDataPA?.value[0]?.ID || "";
            projectLastIdAR = assetDataAR?.value[0]?.ID || "";
            projectColumnName = this._props.dataMapping?.DIM_PROJECT || "";
        }

        const lines = rawData.split("\n");
        const headers = lines[0].split(",");
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentLine = lines[i].split(",");

            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j] || '';
            }

            if (isAutoId) {
                const columnIndex = headers.indexOf(projectColumnName);
                const autoIdPrefix = currentLine[columnIndex]?.substring(0, 2) === 'PP' ? 'PA' : 'AR';
                const nextAutoId = autoIdPrefix === 'PA' ? parseInt(projectLastIdPA.substring(2)) + 1 : parseInt(projectLastIdAR.substring(2)) + 1;
                const autoId = autoIdPrefix + nextAutoId.toString().padStart(8, '0');

                if (autoIdPrefix === 'PA') {
                    projectLastIdPA = autoId;
                } else {
                    projectLastIdAR = autoId;
                }

                //obj['AUTOID'] = autoId;
                obj[this._props.dataMapping?.DIM_ASSET] = autoId;
            }

            result.push(obj);
        }

        this._csvNewData = result;
        return result;
    }

    //Return which asset don't have NEW word in Column
    async parseExistAssetCSV() {
        const rawData = filterNewRecords(this._rawsData, false);

        const lines = rawData.split("\n");
        const headers = lines[0].split(",");
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentLine = lines[i].split(",");

            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j] || '';
            }
            result.push(obj);
        }

        this._csvExistData = result;
        return result;
    }

    onCustomWidgetBeforeUpdate(changedProperties) {
        this._props = { ...this._props, ...changedProperties };
    }

    onCustomWidgetAfterUpdate(changedProperties) {

    }
}

customElements.define("com-rohitchouhan-wbdplanning", WBDPlanning);