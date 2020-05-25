const { toCamel, getDefaultValue, defineGlobalPackages, findDependencies } = require('./helpers');

const getImportCode = (componentName) => {
  return `import Vue from 'vue';\n` +
          `import createWrapper from '@@/utils';\n\n` +
          `// Target module\n` +
          `import ${componentName} from '../components/${componentName}.vue';\n\n`;
}

const getConstantsCode = (globalPackages) => {
  let str = `let wrapper;\n` +
            `let mountingOptions;\n`;

  if (globalPackages.includes('store')) {
    str += `let storeOptions;\n`;
  }

  return str += '\n';
}

const getPropsCode = (props, tab, convertToCamel = true) => {
  return props
    ? props.reduce((str, { name, type, default: value, required }) => {
        const nameProp = convertToCamel ? toCamel(name) : name;
        const hintForRequired = required ? ' // !required' : '';

        return str += `${tab}${nameProp}: ${getDefaultValue(value, type) || '\'\''},${hintForRequired}\n`
      }, '')
    : '\n';
};

const getDataCode = (data, tab, convertToCamel = true) => {
  return data
    ? data.reduce((str, { name, type, initial: value }) => {
        const nameData = convertToCamel ? toCamel(name) : name;
        return str += `${tab}${nameData}: ${getDefaultValue(value, type) || '\'\''},\n`
      }, '')
    : '\n';
};

const getMountingOptionsCode = ({ props, data }, componentInString) => {
  let str = `\tmountingOptions = {\n` +
              `\t\tpropsData: {\n` +
              `${getPropsCode(props, '\t\t\t')}` +
              `\t\t},\n`;

  if (data && data.length) {
    str += `\t\tdata() {\n` +
            `\t\t\treturn {\n` +
            `${getDataCode(data, '\t\t\t\t', false)}` +
            `\t\t\t};\n` +
            `\t\t},\n`;
  }

  if (componentInString.search('mixins') !== -1) {
    str += `\t\tmixins: [],\n`;
  }

  str +=`\t};\n\n` +
        `\t/* in case of use some api method */\n` +
        `\t// someApi.someMethods = jest.fn(() => {\n` +
        `\t//   return new Promise((resolve) => {\n` +
        `\t//     resolve({});\n` +
        `\t//   });\n` +
        `\t// });\n\n`;

  return str;
};

const getStoreCode = (globalPackages) => {
  if (globalPackages.includes('store')) {
    return `\tstoreOptions = {\n` +
            `\t\tmodules: {\n` +
            `\t\t\tmoduleName: {\n` +
            `\t\t\t\tnamespaced: true,\n` +
            `\t\t\t\tstate: {},\n` +
            `\t\t\t},\n` +
            `\t\t},\n` +
            `\t};\n\n`;
  }

  return '';
};

const getGlobalPackagesCode = (globalPackages) => {
  if (globalPackages && globalPackages.length) {
    let str = '';
    if (globalPackages.includes('store')) {
      str += `\t\t\tstoreOptions,\n`;
    }

    str += globalPackages.reduce((code, package) => {
      if (package !== 'store') {
        return code += `\t\t\t${package}: true,\n`;
      }

      return code;
    }, '')

    return str;
  }

  return '';
};

const getMountPluginsCode = (componentName, globalPackages, componentInJson, componentInString) => {
  return `beforeEach(() => {\n` +
    `${getMountingOptionsCode(componentInJson, componentInString)}` +
    `${getStoreCode(globalPackages)}` +
    `\twrapper = createWrapper(\n` +
      `\t\t${componentName},\n` +
      `\t\t{\n` +
      `\t\t\tmountingOptions,\n` +
      `${getGlobalPackagesCode(globalPackages)}` +
      `\t\t}\n` +
    `\t);\n` +
  `});\n\n` +
  `afterEach(() => {\n` +
    `\twrapper.destroy();\n` +
  `});\n\n`;
};

const getSetPropsCode = (props) => {
  if (!props || !props.length) return '';

  let str = `\t\t\twrapper.setProps({\n` +
            `${getPropsCode(props, '\t\t\t\t')}` +
            `\t\t\t});\n`;

  return str;
}

const getSetDataCode = (data) => {
  if (!data || !data.length) return '';

  let str = `\t\t\twrapper.setData({\n` +
            `${getDataCode(data, '\t\t\t\t', false)}` +
            `\t\t\t});\n`;

  return str;
}

const getComputedTestCode = (componentInJson) => {
  const { computed, props, data } = componentInJson;

  if (!computed || !computed.length) return '';

  let str = `\tdescribe('computed', () => {\n`;

  str += computed.reduce((code, { name, dependencies }) => {
    const dependenciesProps = findDependencies(dependencies, props);
    const dependenciesData = findDependencies(dependencies, data);

    return code += `\t\tit('${name}: should return ...', async () => {\n` +
        `${getSetPropsCode(dependenciesProps)}` +
        `${getSetDataCode(dependenciesData)}` +
        `\t\t\tawait Vue.nextTick();\n\n` +
        `\t\t\texpect(wrapper.element).toMatchSnapshot();\n` +
        `\t\t\texpect(wrapper.vm.${name}).toMatchObject();\n` +
        `\t\t\texpect(wrapper.vm.${name}).toBe();\n` +
      `\t\t});\n\n`;
  }, '');

  str += `\t});\n\n`;

  return str;
};

const getMethodsTestCode = (componentInJson) => {
  const { methods } = componentInJson;

  if (!methods || !methods.length) return '';

  let str = `\tdescribe('methods', () => {\n`;

  str += methods.reduce((code, { name }) => {
    return code += `\t\tit('${name}: should call $emit() with ... or return ...', () => {\n` +
        `\t\t\tconst someMethodSpy = jest.fn().mockImplementation(() => {});\n` +
        `\t\t\twrapper.vm.someMethod = someMethodSpy;\n\n` +
        `\t\t\twrapper.vm.${name}();\n\n` +
        `\t\t\texpect(wrapper.vm.someMethod).toHaveBeenCalled();\n` +
        `\t\t\texpect(wrapper.emitted('event')).toEqual(someParams)\n` +
        `\t\t\texpect(wrapper.vm.someValue).toMatchObject();\n` +
        `\t\t\texpect(wrapper.vm.someValue).toBe();\n` +
      `\t\t});\n\n`;
  }, '');

  if (methods.filter((method) => method.name.search('validate') !== -1).length) {
    str += `\t\t// This test was added because the validate method was found\n` +
      `\t\tit('validate: should return resolve / reject promise and set ...', async () => {\n` +

          `\t\t\twrapper.vm.$refs = {\n` +
            `\t\t\t\tsomeRefName: {\n` +
              `\t\t\t\t\tvalidate: jest.fn(() => {\n` +
                `\t\t\t\t\t\// eslint-disable-next-line prefer-promise-reject-errors\n` +
                `\t\t\t\t\t\treturn Promise.reject();\n` +
              `\t\t\t\t\t}),\n` +
            `\t\t\t\t},\n` +
          `\t\t\t};\n\n` +

        `\t\t\ttry {\n` +
          `\t\t\t\tawait wrapper.vm.validate();\n` +
        `\t\t\t} catch (e) {\n` +
          `\t\t\t\texpect(wrapper.vm.$data.errorMessage).toBe(true);\n` +
        `\t\t\t}\n` +
        `\t\t\t// or\n` +
        `\t\t\texpect(wrapper.vm.$data.errorMessage).toBe(false);\n` +
      `\t\t});\n\n`;
  }

  str += `\t});\n`;

  return str;
};

const getDefaultTestCode = (componentInJson, componentName) => {
  return `describe('${componentName}.vue component', () => {\n` +
    `\tit('is a Vue instance', () => {\n` +
      `\t\texpect(wrapper.isVueInstance).toBeTruthy();\n` +
    `\t});\n\n` +
  
    `\tit('snapshot with default props', () => {\n` +
      `\t\texpect(wrapper.element).toMatchSnapshot();\n` +
    `\t});\n\n` +
  
    `\tit('snapshot with readonly prop', async () => {\n` +
      `\t\twrapper.setProps({\n` +
        `\t\t\treadonly: true,\n` +
      `\t\t});\n` +
      `\t\tawait Vue.nextTick();\n\n` +
      
      `\t\texpect(wrapper.element).toMatchSnapshot();\n` +
    `\t});\n\n` + 
    `${getComputedTestCode(componentInJson)}` +
    `${getMethodsTestCode(componentInJson)}` +
  `});\n`
};

module.exports = (componentInJson, componentInString) => {
  return new Promise((resolve, reject) => {
    const testFileName = componentInJson.name;
    const globalPackages = defineGlobalPackages(componentInString);

    const code = getImportCode(testFileName)
      + getConstantsCode(globalPackages)
      + getMountPluginsCode(testFileName, globalPackages, componentInJson, componentInString)
      + getDefaultTestCode(componentInJson, testFileName);

    resolve(code);
  });
}
