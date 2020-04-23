<template>
  <div>
    <ElForm
      ref="form"
      :model="template"
      :rules="formRules"
      label-position="left"
      label-width="240px"
      class="template-pla-spec"
    >
      <ElFormItem
        prop="specification"
        :label="$t('Specification PLA')"
      >
        <BaseTemplatePlaSpecSelect
          :id-prefix="`${idPrefix}-select-pla-spec`"
          :selected-pla-spec="template.plaSpecification"
          :readonly="readonly || basedTemplate !== null"
          @update-pla-spec="$emit('update-pla-spec', $event)"
        />
      </ElFormItem>
    </ElForm>

    <PscDivider
      v-if="!template.plaSpecification.code"
      margin="0 24px"
    />

    <BaseTemplatePlaChars
      v-if="template.plaSpecification.code"
      ref="templatePlaChars"
      :id-prefix="`${idPrefix}-select-chars`"
      :template="template"
      :based-template="basedTemplate"
      :readonly="readonly"
      @update-template-props="$emit('update-template-props', $event)"
      @open-settings-drawer="$emit('open-settings-drawer')"
    />

    <PscNothingHere
      v-else
      class="nothing-here"
    >
      <p>{{ $t('Please select PLA specification') }}</p>
    </PscNothingHere>
  </div>
</template>

<script>
import _ from 'lodash';
import BaseTemplatePlaChars from './BaseTemplatePlaChars';
import BaseTemplatePlaSpecSelect from './BaseTemplatePlaSpecSelect';

export default {
  components: {
    BaseTemplatePlaSpecSelect,
    BaseTemplatePlaChars,
  },

  props: {
    template: {
      type: Object,
      required: true,
    },
    basedTemplate: {
      type: Object,
      default: null,
    },
    idPrefix: {
      type: String,
      default: '',
    },
    readonly: Boolean,
  },

  created() {
    this.setValidationRules();
  },

  methods: {
    setValidationRules() {
      const plaSpecValidator = (template, value, callback) => {
        const plaCode = _.get(this, 'template.plaSpecification.code', null);

        if (!plaCode) {
          callback(new Error(this.$t('Specification PLA is required')));
          return;
        }
        callback();
      };

      this.formRules = {
        specification: [
          {
            required: true,
            validator: plaSpecValidator,
          },
        ],
      };
    },

    validate() {
      if (this.template.plaSpecification.code) {
        return Promise.all([
          this.$refs.form.validate(),
          this.$refs.templatePlaChars.validate(),
        ]);
      }
      return Promise.all([
        this.$refs.form.validate(),
      ]);
    },
  },
};
</script>

<style lang="scss" scoped>
.nothing-here {
  text-align: center;
  margin-top: 120px;
}
</style>

<i18n>
{
  "ru": {
    "Specification PLA": "Спецификация PLA",
    "Specification PLA is required": "Выберите спецификацию",
    "Please select specification PLA": "Выберите спецификацию PLA"
  }
}
</i18n>
