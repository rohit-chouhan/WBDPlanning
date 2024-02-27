export const StoryTemplate = ` <style>
  #upload-container {
    background-color: #fbc404;
    border: 1px solid #e0e0e0;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  #file-input,
  #upload,
  #type-select {
    margin: 2px 0;
    padding: 5px;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 10px;
    outline: none;
    height:32px;
  }

  #upload {
    background-color: #4CAF50;
    color: #fff;
    cursor: pointer;
  }

  #type-select {
    background-color: #fff;
    display: none;
  }

  #uploading {
    display: flex;
    justify-content: center;
    display: none;
  }

  input[type=file] {
    background: #fff;
  }

  input[type=file]::file-selector-button {
    margin-right: 20px;
    border: none;
    background: #0e0a77;
    padding: 5px 10px;
    border-radius: 10px;
    color: #fff;
    cursor: pointer;
    transition: background .2s ease-in-out;
  }

  input[type=file]::file-selector-button:hover {
    background: #0d45a5;
  }

  #main-box {
    display: none;
  }
</style>
<div id="upload-container">
  <div id="main-box">
    <input type="file" id="file-input" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
    <select id="type-select">
      
    </select>
  </div>
  <div id="uploading">
    <center>
       <img width="70" style="margin-left:-35px;" src="https://cdn.jsdelivr.net/gh/rohit-chouhan/WBDPlanning@1.0.11/dist/flash-loading.gif" /> 
       <span style="font-size:12px">I'm on my way, please wait...</span>
    </center>
  </div>
</div>`;