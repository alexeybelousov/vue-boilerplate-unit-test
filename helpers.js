const toCamel = (s) => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const getDefaultValueByType = (type) => {
  switch(type) {
    case 'Function':
    case 'FunctionExpression':
    case 'function':
      return '() => {}';
    case 'Object':
    case 'ObjectExpression':  
    case 'object': 
      return '{}';
    case 'Array':
    case 'ArrayExpression':
    case 'array': 
      return '[]';
    case 'Boolean': 
    case 'boolean':
      return 'false';
    case 'Number':
    case 'number':
      return '0';
    case 'string':
    case 'String':
    default:
      return null;
  }
};

const getValueByType = (value, type) => {
  switch(type) {
    case 'Function':
    case 'FunctionExpression':
    case 'function':
    case 'Array':
    case 'ArrayExpression':
    case 'array':
    case 'Boolean':
    case 'boolean':
    case 'Number':
    case 'number':  
      return value;
    case 'Object':
    case 'ObjectExpression':  
    case 'object':
      return typeof value === 'string' ? value : '{}';

    case 'String': 
    case 'string': 
      return `\'${value}\'`;
  }
};

const getDefaultValue = (value, type) => {
  if (!value || value === '__undefined__') {
    return getDefaultValueByType(type);
  }

  return getValueByType(value, type);
};

const defineGlobalPackages = (componentInString) => {
  const globalPackages = [];

  if (componentInString.indexOf('vuex') !== -1) {
    globalPackages.push('store');
  }
  if (componentInString.indexOf('Psc') !== -1) {
    globalPackages.push('importCommonPscComponents');
  }
  if (componentInString.indexOf('$t(') !== -1) {
    globalPackages.push('i18n');
  }
  if (componentInString.indexOf('$accessControl') !== -1) {
    globalPackages.push('accessControl');
  }

  return globalPackages;
};

const findDependencies = (dependencies, target) => {
  return dependencies.reduce((depsProps, dependency) => {
    const depProp = target.find((prop) => toCamel(prop.name) === dependency);

    if (depProp) {
      return [...depsProps, { 
        name: dependency, 
        type: depProp.type,
        default: depProp.default,
        initial: depProp.initial,
      }];
    }

    return depsProps;
   }, []);
};

module.exports = { toCamel, getDefaultValue, defineGlobalPackages, findDependencies };
