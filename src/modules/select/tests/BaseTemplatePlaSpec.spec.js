import Vue from 'vue';
import { mountWithPlugins, PLUGINS } from '@@/utils';
import BaseTemplatePlaSpec from '../components/BaseTemplatePlaSpec';

const mountOptions = {
	propsData: {
		template: {}, // !required
		basedTemplate: {},
		idPrefix: '',
		readonly: false,
	},
	computed: {
		/* in case of use mapState or mapGetters */
		// someValueFromVuex: () => [{ code: 'price_type' }],
	},
	methods: {
		/* in case of use mapActions or mapMutations */
		// someActionFromVuex: jest.fn(),
	},
	sync: false,
};

/* in case of use some api method */
// someApi.someMethods = jest.fn(() => {
//   return new Promise((resolve) => {
//     resolve({});
//   });
// });
let wrapper;

beforeEach(() => {
	wrapper = mountWithPlugins({
		componentToMount: BaseTemplatePlaSpec,
		options: mountOptions,
		plugins: [
			PLUGINS.I18N,
		],
	});
});

afterEach(() => {
	wrapper.destroy();
});

describe('BaseTemplatePlaSpec.vue component', () => {
	it('is a Vue instance', () => {
		expect(wrapper.isVueInstance).toBeTruthy();
	});

	it('snapshot with default props', () => {
		expect(wrapper.element).toMatchSnapshot();
	});

	it('snapshot with readonly prop', async () => {
		wrapper.setProps({
			readonly: true,
		});
		await Vue.nextTick();

		expect(wrapper.element).toMatchSnapshot();
	});

	describe('methods', () => {
		beforeEach(() => {
			wrapper.setMethods({
				$emit: jest.fn(),
			});
		});

		it('setValidationRules: should call emit() with ... or return ...', () => {
			wrapper.setMethods({
				someMethod: jest.fn(),
			});

			wrapper.vm.setValidationRules();
			expect(wrapper.vm.$emit).toHaveBeenCalledWith('some-event', someParams)
			expect(wrapper.vm.someMethod).toHaveBeenCalled();
			expect(wrapper.vm.someValue).toMatchObject();
			expect(wrapper.vm.someValue).toBe();
		});

		it('validate: should call emit() with ... or return ...', () => {
			wrapper.setMethods({
				someMethod: jest.fn(),
			});

			wrapper.vm.validate();
			expect(wrapper.vm.$emit).toHaveBeenCalledWith('some-event', someParams)
			expect(wrapper.vm.someMethod).toHaveBeenCalled();
			expect(wrapper.vm.someValue).toMatchObject();
			expect(wrapper.vm.someValue).toBe();
		});

		// This test was added because the validate method was found
		it('validate: should return resolve / reject promise and set ...', async () => {
			wrapper.setMethods({
				$refs: {
					someRefName: {
						validate: jest.fn(() => {
							return Promise.reject();
						}),
					},
				},
			});

			try {
				await wrapper.vm.validate();
			} catch (e) {
				expect(wrapper.vm.$data.errorMessage).toBe(true);
			}
			// or
			expect(wrapper.vm.$data.errorMessage).toBe(false);
		});

	});
});
