import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  StyleSheet,
  Platform,
  ViewPropTypes,
} from 'react-native';

import Line from '../line';
import Label from '../label';
import Affix from '../affix';
import Helper from '../helper';
import Counter from '../counter';

import styles from './styles';

const textInputProps = [
  'autoCapitalize',
  'autoComplete',
  'autoCorrect',
  'autoFocus',
  'blurOnSubmit',
  'clearButtonMode',
  'clearTextOnFocus',
  'contextMenuHidden',
  'defaultValue',
  'editable',
  'keyboardType',
  'maxLength',
  'multiline',
  'numberOfLines',
  'onChange',
  'onChangeText',
  'onContentSizeChange',
  'onEndEditing',
  'onFocus',
  'onKeyPress',
  'onSubmitEditing',
  'passwordRules',
  'placeholder',
  'placeholderTextColor',
  'returnKeyLabel',
  'returnKeyType',
  'secureTextEntry',
  'selectionColor',
  'selectTextOnFocus',
  'style',
  'textAlign',
  'value',
  'underlineColorAndroid',
  'editable',
  'maxLength',
  'showSoftInputOnFocus',
  'inputAccessoryViewID',
  'scrollEnabled',
  'textAlignVertical',
  'caretHidden',
  'clearTextOnFocus',
  'enableInteractiveSelection'
];

function startAnimation(animation, options, callback) {
  Animated
    .timing(animation, options)
    .start(callback);
}

function labelStateFromProps(props, state) {
  let { placeholder, defaultValue, disableLabelAnimation } = props;
  let { text, receivedFocus } = state;

  return !!(placeholder || text || (!receivedFocus && defaultValue) || disableLabelAnimation);
}

function errorStateFromProps(props, state) {
  let { error } = props;

  return !!error;
}

export default class TextField extends PureComponent {
  static defaultProps = {
    underlineColorAndroid: 'transparent',
    disableFullscreenUI: true,
    autoCapitalize: 'sentences',
    editable: true,

    animationDuration: 225,

    fontSize: 16,
    labelFontSize: 12,

    tintColor: 'rgb(0, 145, 234)',
    textColor: 'rgba(0, 0, 0, .87)',
    baseColor: 'rgba(0, 0, 0, .38)',

    errorColor: 'rgb(213, 0, 0)',

    lineWidth: StyleSheet.hairlineWidth,
    activeLineWidth: 2,
    disabledLineWidth: 1,

    lineType: 'solid',
    disabledLineType: 'dotted',

    disabled: false,
  };

  static propTypes = {
    ...TextInput.propTypes,

    animationDuration: PropTypes.number,
    animationOffset: PropTypes.number,

    fontSize: PropTypes.number,
    labelFontSize: PropTypes.number,

    contentInset: PropTypes.shape({
      top: PropTypes.number,
      label: PropTypes.number,
      input: PropTypes.number,
      left: PropTypes.number,
      right: PropTypes.number,
    }),

    labelOffset: Label.propTypes.offset,

    // labelTextStyle: PropTypes.any,
    // titleTextStyle: PropTypes.any,
    // affixTextStyle: PropTypes.any,

    tintColor: PropTypes.string,
    textColor: PropTypes.string,
    baseColor: PropTypes.string,

    label: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    title: PropTypes.string,

    characterRestriction: PropTypes.number,

    error: PropTypes.string,
    errorColor: PropTypes.string,
    errorTestId: PropTypes.string,

    lineWidth: PropTypes.number,
    activeLineWidth: PropTypes.number,
    disabledLineWidth: PropTypes.number,

    lineType: Line.propTypes.lineType,
    disabledLineType: Line.propTypes.lineType,

    disabled: PropTypes.bool,

    formatText: PropTypes.func,

    renderLeftAccessory: PropTypes.oneOfType([PropTypes.func, PropTypes.boolean]),
    renderRightAccessory: PropTypes.oneOfType([PropTypes.func, PropTypes.boolean]),

    prefix: PropTypes.string,
    suffix: PropTypes.string,

    // containerStyle: PropTypes.any,
    // inputContainerStyle: PropTypes.any,
  };

  static inputContainerStyle = styles.inputContainer;

  static _contentInset = {
    top: 16,
    label: 4,
    input: 8,
    left: 0,
    right: 0,
  };

  contentInset() {
    return {
      ...TextField._contentInset,
      ...(this.props.contentInset || {}),
    }
  }

  static labelOffset = {
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
  };

  static getDerivedStateFromProps({ error, value }, state) {
    let update = {};
    /* Keep last received error in state */
    if (error && error !== state.error) {
      update.error = error;
    }
    /* Keep last value in state */
    if (value !== state.text) {
      update.text = value;
    }

    return update;
  }

  constructor(props) {
    super(props);

    this.onBlur = this.onBlur.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onPress = this.focus.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onChangeText = this.onChangeText.bind(this);
    this.onContentSizeChange = this.onContentSizeChange.bind(this);
    this.onFocusAnimationEnd = this.onFocusAnimationEnd.bind(this);

    this.createGetter('labelOffset');

    this.inputRef = React.createRef();
    this.mounted = false;
    this.focused = false;

    let { value: text, error, fontSize } = this.props;

    let labelState = labelStateFromProps(this.props, { text })? 1 : 0;
    let focusState = errorStateFromProps(this.props)? -1 : 0;

    this.state = {
      text,
      error,

      focusAnimation: new Animated.Value(focusState),
      labelAnimation: new Animated.Value(labelState),

      receivedFocus: false,

      height: fontSize * 1.5,
    };
  }

  createGetter(name) {
    this[name] = () => {
      let { [name]: value } = this.props;
      let { [name]: defaultValue } = this.constructor;

      return { ...defaultValue, ...value };
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidUpdate(prevProps, prevState) {
    let errorState = errorStateFromProps(this.props);
    let prevErrorState = errorStateFromProps(prevProps);

    if (errorState ^ prevErrorState) {
      this.startFocusAnimation();
    }

    let labelState = labelStateFromProps(this.props, this.state);
    let prevLabelState = labelStateFromProps(prevProps, prevState);

    if (labelState ^ prevLabelState) {
      this.startLabelAnimation();
    }
  }

  startFocusAnimation() {
    let { focusAnimation } = this.state;
    let { animationDuration: duration } = this.props;

    let options = {
      toValue: this.focusState(),
      duration,
      useNativeDriver: false,
    };

    startAnimation(focusAnimation, options, this.onFocusAnimationEnd);
  }

  startLabelAnimation() {
    let { labelAnimation } = this.state;
    let { animationDuration: duration, disableLabelAnimation } = this.props;

    if (disableLabelAnimation) {
      return;
    }

    let options = {
      toValue: this.labelState(),
      useNativeDriver: true,
      duration,
    };

    startAnimation(labelAnimation, options);
  }

  setNativeProps(props) {
    let { current: input } = this.inputRef;

    input.setNativeProps(props);
  }

  focusState() {
    if (errorStateFromProps(this.props)) {
      return -1;
    }

    return this.focused? 1 : 0;
  }

  labelState() {
    if (labelStateFromProps(this.props, this.state)) {
      return 1;
    }

    return this.focused? 1 : 0;
  }

  focus() {
    let { disabled, editable } = this.props;
    let { current: input } = this.inputRef;

    if (!disabled && editable) {
      input.focus();
    }
  }

  blur() {
    let { current: input } = this.inputRef;

    input.blur();
  }

  clear() {
    let { current: input } = this.inputRef;

    input.clear();

    /* onChangeText is not triggered by .clear() */
    this.onChangeText('');
  }

  value() {
    let { text } = this.state;
    let { defaultValue } = this.props;

    let value = this.isDefaultVisible()?
      defaultValue:
      text;

    if (null == value) {
      return '';
    }

    return 'string' === typeof value?
      value:
      String(value);
  }

  setValue(text) {
    this.setState({ text });
  }

  isFocused() {
    let { current: input } = this.inputRef;

    return input.isFocused();
  }

  isRestricted() {
    let { characterRestriction: limit } = this.props;
    let { length: count } = this.value();

    return limit < count;
  }

  isErrored() {
    return errorStateFromProps(this.props);
  }

  isDefaultVisible() {
    let { text, receivedFocus } = this.state;
    let { defaultValue } = this.props;

    return !receivedFocus && null == text && null != defaultValue;
  }

  isPlaceholderVisible() {
    let { placeholder } = this.props;

    return placeholder && !this.focused && !this.value();
  }

  isLabelActive() {
    return 1 === this.labelState();
  }

  onFocus(event) {
    let { onFocus, clearTextOnFocus } = this.props;
    let { receivedFocus } = this.state;

    if ('function' === typeof onFocus) {
      onFocus(event);
    }

    if (clearTextOnFocus) {
      this.clear();
    }

    this.focused = true;

    this.startFocusAnimation();
    this.startLabelAnimation();

    if (!receivedFocus) {
      this.setState({ receivedFocus: true, text: this.value() });
    }
  }

  onBlur(event) {
    let { onBlur } = this.props;

    if ('function' === typeof onBlur) {
      onBlur(event);
    }

    this.focused = false;

    this.startFocusAnimation();
    this.startLabelAnimation();
  }

  onChange(event) {
    let { onChange } = this.props;

    if ('function' === typeof onChange) {
      onChange(event);
    }
  }

  onChangeText(text) {
    let { onChangeText, formatText } = this.props;

    if ('function' === typeof formatText) {
      text = formatText(text);
    }

    this.setState({ text });

    if ('function' === typeof onChangeText) {
      onChangeText(text);
    }
  }

  onContentSizeChange(event) {
    let { onContentSizeChange, fontSize } = this.props;
    let { height } = event.nativeEvent.contentSize;

    if ('function' === typeof onContentSizeChange) {
      onContentSizeChange(event);
    }

    this.setState({
      height: Math.max(
        fontSize * 1.5,
        Math.ceil(height) + Platform.select({ ios: 4, android: 1 })
      ),
    });
  }

  onFocusAnimationEnd() {
    let { error } = this.props;
    let { error: retainedError } = this.state;

    if (this.mounted && !error && retainedError) {
      this.setState({ error: null });
    }
  }

  inputHeight() {
    let { height: computedHeight } = this.state;
    let { multiline, fontSize, height = computedHeight } = this.props;

    return multiline?
      height:
      fontSize * 1.5;
  }

  inputContainerHeight() {
    let { labelFontSize, multiline } = this.props;
    let contentInset = this.contentInset();

    if ('web' === Platform.OS && multiline) {
      return 'auto';
    }

    return contentInset.top
      + labelFontSize
      + contentInset.label
      + this.inputHeight()
      + contentInset.input;
  }

  inputProps() {
    let store = {};
    textInputProps.forEach((key)=>{
      if ('defaultValue' !== key && key in this.props) {
        store[key] = this.props[key];
      }
    })
    return store;
  }

  inputStyle() {
    let { fontSize, baseColor, textColor, disabled, multiline } = this.props;

    let color = disabled || this.isDefaultVisible()?
      baseColor:
      textColor;

    let style = {
      fontSize,
      color,

      height: this.inputHeight(),
    };

    if (multiline) {
      let lineHeight = fontSize * 1.5;
      let offset = 'ios' === Platform.OS? 2 : 0;

      style.height += lineHeight;
      style.transform = [{
        translateY: lineHeight + offset,
      }];
    }

    return style;
  }

  renderLabel(props) {

    let {
      label,
      fontSize,
      labelFontSize,
      labelTextStyle,
      animationOffset,
      halfWidth,
    } = this.props;

    return (
      <Label
        {...props}
        fontSize={fontSize}
        activeFontSize={labelFontSize}
        label={label}
        style={labelTextStyle}
      />
    );
  }

  renderLine(props) {
    return (
      <Line {...props} />
    );
  }

  renderAccessory(type) {
    let renderAccessory = this.props?.[`${type}`];

    if ('function' !== typeof renderAccessory) {
      return null;
    }

    return (
      <View style={styles.accessory}>
        {renderAccessory()}
      </View>
    );
  }

  renderAffix(type) {
    let { labelAnimation } = this.state;
    let {
      [type]: affix,
      fontSize,
      baseColor: color,
      affixTextStyle: style,
    } = this.props;

    if (null == affix) {
      return null;
    }

    let props = {
      type,
      style,
      color,
      fontSize,
      labelAnimation,
    };

    return (
      <Affix {...props}>{affix}</Affix>
    );
  }

  renderHelper() {
    let { focusAnimation, error } = this.state;

    let {
      title,
      disabled,
      baseColor,
      errorColor,
      errorTestId,
      titleTextStyle: style,
      characterRestriction: limit,
    } = this.props;

    let { length: count } = this.value();
    let contentInset = this.contentInset();

    let containerStyle =  {
      paddingLeft: contentInset.left,
      paddingRight: contentInset.right,
    };

    let styleProps = {
      style,
      baseColor,
      errorColor,
    };

    let counterProps = {
      ...styleProps,
      limit,
      count,
    };

    let helperProps = {
      ...styleProps,
      title,
      error,
      testId: errorTestId,
      disabled,
      focusAnimation,
    };

    return (
      <View style={[styles.helperContainer, containerStyle]}>
        <Helper {...helperProps} />
        <Counter {...counterProps} />
      </View>
    );
  }

  renderInput() {
    let {
      disabled,
      editable,
      tintColor,
      style: inputStyleOverrides,
    } = this.props;

    let props = this.inputProps();
    let inputStyle = this.inputStyle();

    return (
      <TextInput
        selectionColor={tintColor}

        {...props}

        style={[styles.input, inputStyle, inputStyleOverrides]}
        editable={!disabled && editable}
        onChange={this.onChange}
        onChangeText={this.onChangeText}
        onContentSizeChange={this.onContentSizeChange}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        value={this.value()}
        ref={this.inputRef}
      />
    );
  }

  render() {
    let { labelAnimation, focusAnimation } = this.state;
    let {
      editable,
      disabled,
      lineType,
      disabledLineType,
      lineWidth,
      activeLineWidth,
      disabledLineWidth,
      tintColor,
      baseColor,
      errorColor,
      containerStyle,
      renderLeftAccessory,
      renderRightAccessory,
      inputContainerStyle: inputContainerStyleOverrides,
    } = this.props;

    let restricted = this.isRestricted();
    let contentInset = this.contentInset();

    let inputContainerStyle = {
      paddingTop: contentInset.top,
      paddingRight: contentInset.right,
      paddingBottom: contentInset.input,
      paddingLeft: contentInset.left,
      height: this.inputContainerHeight(),
    };

    let containerProps = {
      style: containerStyle,
      onStartShouldSetResponder: () => true,
      onResponderRelease: this.onPress,
      pointerEvents: !disabled && editable?
        'auto':
        'none',
    };

    let inputContainerProps = {
      style: [
        this.constructor.inputContainerStyle,
        inputContainerStyle,
        inputContainerStyleOverrides,
      ],
    };

    let styleProps = {
      disabled,
      restricted,
      baseColor,
      tintColor,
      errorColor,

      contentInset,

      focusAnimation,
      labelAnimation,
    };

    let lineProps = {
      ...styleProps,

      lineWidth,
      activeLineWidth,
      disabledLineWidth,

      lineType,
      disabledLineType,
    };

    return (
      <View {...containerProps}>
        <Animated.View {...inputContainerProps}>
          {this.renderLine(lineProps)}
          {renderLeftAccessory ? this.renderAccessory('renderLeftAccessory') : null}

          <View style={styles.stack}>
            {this.renderLabel(styleProps)}

            <View style={styles.row}>
              {this.renderAffix('prefix')}
              {this.renderInput()}
              {this.renderAffix('suffix')}
            </View>
          </View>

          {renderRightAccessory ? this.renderAccessory('renderRightAccessory'): null}
        </Animated.View>

        {this.renderHelper()}
      </View>
    );
  }
}
