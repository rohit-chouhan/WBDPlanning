const axios = require('axios');

class FileLoad {
    MODELS_ENDPOINT = "/api/v1/dataimport/models";
    JOBS_ENDPOINT = "/jobs";
    WIDGET_ENDPOINT = "/widget"
    URL = window.location.origin;
    CSRF_TOKEN = null;


    async initialize() {
        this.CSRF_TOKEN = await this.getCSRFToken();
    }

    // List models
    async getModels() {
        try {
            const response = await axios.get(this.URL + this.MODELS_ENDPOINT);
            return response.data;
        } catch (error) {
            console.error('Error in getModels:', error);
            throw error;
        }
    }

    async getMasterData(ModelId = '', DimensionTechnicalId = '', Filter = '') {
        try {
            const path = `/api/v1/dataexport/providers/sac/${ModelId}/${DimensionTechnicalId}?${Filter}`;
            const response = await axios.get(this.URL + path);
            return response.data;
        } catch (error) {
            console.error('Error in getModels:', error);
            throw error;
        }
    }

    // Get csrf token
    async getCSRFToken() {
        try {
            const jobUrl = this.URL + this.MODELS_ENDPOINT;
            const response = await axios.get(jobUrl, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Csrf-Token": "fetch",
                },
            });
            return response.headers['x-csrf-token'];
        } catch (error) {
            console.error('Error in getCSRFToken:', error);
            throw error;
        }
    }

    async createJob(modelID, importType, mapping, rawData) {
        try {
            const url = `${this.URL}/api/v1/dataimport/models/${modelID}/${importType}`;
            const headers = {
                'Content-Type': 'application/json',
                'X-Csrf-Token': this.CSRF_TOKEN
            };

            const response = await axios.post(url, JSON.stringify(mapping), { headers });

            if (response.status === 201) {
                const responseData = response.data;
                const jobID = responseData.jobID;

                // Running Job
                try {
                    const jobPostResponse = await this.jobPost(jobID, rawData);
                    if (jobPostResponse.status !== 201) {
                        return false;
                    }
                    try {
                        await this.validateJobs(jobID);
                        const jobRunResponse = await this.runJobs(jobID);
                        return !(jobRunResponse.status !== 201);
                    } catch (jobRunError) {
                        console.error("Job Run Failure:", jobRunError);
                        return false;
                    }
                } catch (jobRunError) {
                    console.error("Job Run Failure:", jobRunError);
                    return false;
                }
            } else {
                console.error(`HTTP Status Code ${response.status}: ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.error('Error in createMasterDataJob:', error);
            throw error;
        }
    }

    /*
    * Asset creating function
    */

    async createAssetJob(dimId, mapping, rawData) {
        try {
            const url = `${this.URL}/api/v1/dataimport/publicDimensions/${dimId}/publicDimensionData`;
            const headers = {
                'Content-Type': 'application/json',
                'X-Csrf-Token': this.CSRF_TOKEN
            };

            const response = await axios.post(url, JSON.stringify(mapping), { headers });

            if (response.status === 201) {
                const responseData = response.data;
                const jobID = responseData.jobID;

                try {
                    const jobPostResponse = await this.jobPost(jobID, rawData);
                    if (jobPostResponse.status !== 201) {
                        return false;
                    }
                    try {
                        await this.validateJobs(jobID);
                        const jobRunResponse = await this.runJobs(jobID);
                        return !(jobRunResponse.status !== 201);
                    } catch (jobRunError) {
                        console.error("Job Run Failure:", jobRunError);
                        return false;
                    }

                } catch (jobRunError) {
                    console.error("Job Run Failure:", jobRunError);
                    return false;
                }
            } else {
                console.error(`HTTP Status Code ${response.status}: ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.error('Error in createMasterDataJob:', error);
            throw error;
        }
    }


    async runJobs(jobID) {
        try {
            const url = `${this.URL}/api/v1/dataimport/jobs/${jobID}/run`;
            const headers = {
                'Content-Type': 'application/json',
                'X-Csrf-Token': this.CSRF_TOKEN
            };
            const response = await axios.post(url, null, { headers });
            return response;
        } catch (error) {
            console.error('Error in runJobs:', error);
            throw error;
        }
    }

    async validateJobs(jobID) {
        try {
            const url = `${this.URL}/api/v1/dataimport/jobs/${jobID}/validate`;
            const headers = {
                'Content-Type': 'application/json',
                'X-Csrf-Token': this.CSRF_TOKEN
            };
            const response = await axios.post(url, null, { headers });
            return response;
        } catch (error) {
            console.error('Validate in runJobs:', error);
            throw error;
        }
    }

    async jobPost(jobID, data) {
        try {
            const url = `${this.URL}/api/v1/dataimport/jobs/${jobID}`;
            const headers = {
                'Content-Type': 'text/csv',
                'X-Csrf-Token': this.CSRF_TOKEN
            };
            const response = await axios.post(url, data, { headers });
            return response;
        } catch (error) {
            console.error('Error in runJobs:', error);
            throw error;
        }
    }

    async getApiData(modelId, dimensionId, prefix) {
        const MAX_RETRIES = 3; // Maximum number of retries
        let retryCount = 0;

        while (retryCount < MAX_RETRIES) {
            try {
                const filter = dimensionId === 'DIM_PROJECT' ? 'ATR_PRJ_ORIGINATING_NETWORK' : 'ATR_AST_PROJECT_ID';
                const apiUrl = `${this.URL}/api/v1/dataexport/providers/sac/${modelId}/${dimensionId}Master?$orderby=ID desc&$top=10&$filter=${filter} ne '' and startswith(ID, '${prefix}')&$select=ID`;

                const headers = {
                    'Content-Type': 'application/json' // Replace with the actual CSRF token
                };

                const response = await axios.get(apiUrl, { headers });
                return response.data;
            } catch (error) {
                if (error.response && error.response.status === 500) {
                    console.error('Internal Server Error: Retrying...');
                    retryCount++;
                }
            }
        }

        console.error('Exceeded maximum retries.');
        return [];
    }


    async getMasterDataAPI(modelId, dimensionId, filters) {
        const apiUrl = `${this.URL}/api/v1/dataexport/providers/sac/${modelId}/${dimensionId}Master?${filters}`;

        const headers = {
            'Content-Type': 'application/json'
        };

        try {
            const response = await axios.get(apiUrl, { headers });
            return response.data.value;
        } catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    }
}

module.exports = { FileLoad };