const vuedoc = require('@vuedoc/parser');
const createUnitTestFile = require('./createUnitTestFile');

const args = process.argv.slice(2);
const componentPath = args[0];
const debug = args[1] === 'debug' || false;

const options = {
  filename: componentPath
}

vuedoc.parse(options)
  .then((componentInJson) => {
    createUnitTestFile(componentInJson, componentPath, debug)
      .then(() => {
        console.log('Unit tests seed has been created');
      })
      .catch((err) => console.log(err));
  })
  .catch((err) => console.error(err));


