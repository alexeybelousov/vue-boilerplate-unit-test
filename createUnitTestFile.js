const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const createUnitTestCode = require('./createUnitTestCode');

module.exports = (componentInJson, componentPath, debug) => {
  return new Promise((resolve, reject) => {
    const pathToComponent = path.dirname(componentPath);
    const pathToArray = pathToComponent.split('/');
    const pathToModuleDir = pathToArray.filter((el, i) => pathToArray.length - 1 !== i).join('/');
    const testFileName = componentInJson.name;
    const pathToTestDir = `${pathToModuleDir}/tests`;
    const testFileNameWithPath = `${pathToTestDir}/${testFileName}.spec.js`;

    mkdirp(pathToTestDir, function (err) {
      if (err) return reject(err);

      if(fs.existsSync(testFileNameWithPath)) {
        reject(`The file ${testFileName}.spec.js already exists`);
      } else {
        // debug mode -> create json file
        if (debug) {
          const buffer = Buffer.from(JSON.stringify(componentInJson, null, 2));
          fs.writeFileSync(`${pathToTestDir}/${testFileName}.json`, buffer);
        }
        
        // create unit test file
        fs.readFile(componentPath, 'utf8', (err, componentInString) => {
          if (err) return reject(err);

          createUnitTestCode(componentInJson, componentInString)
            .then((code) => {
              fs.writeFile(testFileNameWithPath, code, (err) => {
                if (err) return reject(err);
                  
                resolve(testFileName);
              });
            })
            .catch((err) => reject(err));
        });
      }
    });
  });
}
