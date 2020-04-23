const { toCamel, getDefaultValue, definePackages, findDependencies } = require('./helpers');

const getImportCode = (componentName, packages) => {
  const importPlugins = packages && packages.length ? ', PLUGINS' : '';

  return `import Vue from 'vue';\n` +
          `import { mountWithPlugins${importPlugins} } from '@@/utils';\n` +
          `import ${componentName} from '../components/${componentName}';\n\n`;
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

const getMountOptionsCode = ({ props, data }) => {
  let str = `const mountOptions = {\n` +
              `\tpropsData: {\n` +
              `${getPropsCode(props, '\t\t')}` +
              `\t},\n`;

  if (data && data.length) {
    str += `\tdata() {\n` +
            `\t\treturn {\n` +
            `${getDataCode(data, '\t\t\t', false)}` +
            `\t\t};\n` +
            `\t},\n`;
  }

  str += `\tcomputed: {\n` +
          `\t\t/* in case of use mapState or mapGetters */\n` +
          `\t\t// someValueFromVuex: () => [{ code: 'price_type' }],\n` +
          `\t},\n` +
          `\tmethods: {\n` +
          `\t\t/* in case of use mapActions or mapMutations */\n` +
          `\t\t// someActionFromVuex: jest.fn(),\n` +
          `\t},\n` +
          `\tsync: false,\n` +
        `};\n\n` +
        `/* in case of use some api method */\n` +
        `// someApi.someMethods = jest.fn(() => {\n` +
        `//   return new Promise((resolve) => {\n` +
        `//     resolve({});\n` +
        `//   });\n` +
        `// });\n`;

  return str;
};

const getPackagesCode = (packages) => {
  if (packages && packages.length) {
    let str = `\t\tplugins: [\n`;

    str += packages.reduce((code, package) => {
      return code += `\t\t\tPLUGINS.${package},\n`
    }, '')

    str += `\t\t],\n`;

    return str;
  }

  return '';
};

const getMountPluginsCode = (componentName, packages) => {
  return `let wrapper;\n\n` +
  `beforeEach(() => {\n` +
    `\twrapper = mountWithPlugins({\n` +
      `\t\tcomponentToMount: ${componentName},\n` +
      `\t\toptions: mountOptions,\n` +
      `${getPackagesCode(packages)}` +
    `\t});\n` +
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

  let str = `\tdescribe('methods', () => {\n` +
    `\t\tbeforeEach(() => {\n` +
      `\t\t\twrapper.setMethods({\n` +
        `\t\t\t\t$emit: jest.fn(),\n` +
      `\t\t\t});\n` +
    `\t\t});\n\n`;

  str += methods.reduce((code, { name }) => {
    return code += `\t\tit('${name}: should call emit() with ... or return ...', () => {\n` +
        `\t\t\twrapper.setMethods({\n` +
        `\t\t\t\tsomeMethod: jest.fn(),\n` +
        `\t\t\t});\n\n` +
        `\t\t\twrapper.vm.${name}();\n` +
        `\t\t\texpect(wrapper.vm.$emit).toHaveBeenCalledWith('some-event', someParams)\n` +
        `\t\t\texpect(wrapper.vm.someMethod).toHaveBeenCalled();\n` +
        `\t\t\texpect(wrapper.vm.someValue).toMatchObject();\n` +
        `\t\t\texpect(wrapper.vm.someValue).toBe();\n` +
      `\t\t});\n\n`;
  }, '');

  if (methods.filter((method) => method.name.search('validate') !== -1).length) {
    str += `\t\t// This test was added because the validate method was found\n` +
      `\t\tit('validate: should return resolve / reject promise and set ...', async () => {\n` +
        `\t\t\twrapper.setMethods({\n` +
          `\t\t\t\t$refs: {\n` +
            `\t\t\t\t\tsomeRefName: {\n` +
              `\t\t\t\t\t\tvalidate: jest.fn(() => {\n` +
                `\t\t\t\t\t\t\treturn Promise.reject();\n` +
              `\t\t\t\t\t\t}),\n` +
            `\t\t\t\t\t},\n` +
          `\t\t\t\t},\n` +
        `\t\t\t});\n\n` +
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
    const packages = definePackages(componentInString);

    const code = getImportCode(testFileName, packages) 
      + getMountOptionsCode(componentInJson)
      + getMountPluginsCode(testFileName, packages)
      + getDefaultTestCode(componentInJson, testFileName);

    resolve(code);
  });
}
