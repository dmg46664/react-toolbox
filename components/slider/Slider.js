import React from 'react';
import ReactDOM from 'react-dom';
import classnames from 'classnames';
import { themr } from 'react-css-themr';
import events from '../utils/events';
import prefixer from '../utils/prefixer';
import utils from '../utils/utils';
import InjectProgressBar from '../progress_bar/ProgressBar.js';
import InjectInput from '../input/Input.js';

const factory = (ProgressBar, Input) => {
  class Slider extends React.Component {
    static propTypes = {
      className: React.PropTypes.string,
      editable: React.PropTypes.bool,
      max: React.PropTypes.number,
      min: React.PropTypes.number,
      onChange: React.PropTypes.func,
      pinned: React.PropTypes.bool,
      snaps: React.PropTypes.bool,
      step: React.PropTypes.number,
      theme: React.PropTypes.shape({
        container: React.PropTypes.string,
        editable: React.PropTypes.string,
        innerknob: React.PropTypes.string,
        innerprogress: React.PropTypes.string,
        input: React.PropTypes.string,
        knob: React.PropTypes.string,
        pinned: React.PropTypes.string,
        pressed: React.PropTypes.string,
        progress: React.PropTypes.string,
        ring: React.PropTypes.string,
        slider: React.PropTypes.string,
        snap: React.PropTypes.string,
        snaps: React.PropTypes.string
      }),
      value: React.PropTypes.number
    };

    static defaultProps = {
      className: '',
      editable: false,
      max: 100,
      min: 0,
      pinned: false,
      snaps: false,
      step: 0.01,
      value: 0
    };

    state = {
      inputFocused: false,
      inputValue: null,
      sliderLength: 0,
      sliderStart: 0
    };

    componentDidMount () {
      window.addEventListener('resize', this.handleResize);
      this.handleResize();
    }

    shouldComponentUpdate (nextProps, nextState) {
      if (!this.state.inputFocused && nextState.inputFocused) return false;
      if (this.state.inputFocused && this.props.value !== nextProps.value) {
        this.setState({inputValue: this.valueForInput(nextProps.value)});
        return false;
      }
      return true;
    }

    componentWillUnmount () {
      window.removeEventListener('resize', this.handleResize);
      events.removeEventsFromDocument(this.getMouseEventMap());
      events.removeEventsFromDocument(this.getTouchEventMap());
      events.removeEventsFromDocument(this.getKeyboardEvents());
    }

    handleInputFocus = () => {
      this.setState({
        inputFocused: true,
        inputValue: this.valueForInput(this.props.value)
      });
    };

    handleInputChange = (value) => {
      this.setState({inputValue: value});
    };

    handleInputBlur = (event) => {
      const value = this.state.inputValue || 0;
      this.setState({inputFocused: false, inputValue: null}, () => {
        this.props.onChange(this.trimValue(value), event);
      });
    };

    handleKeyDown = (event) => {
      if ([13, 27].indexOf(event.keyCode) !== -1) {
        this.refs.input.blur();
        ReactDOM.findDOMNode(this).blur();
      }
      if (event.keyCode === 38) this.addToValue(this.props.step);
      if (event.keyCode === 40) this.addToValue(-this.props.step);
    };

    handleMouseDown = (event) => {
      if (this.state.inputFocused) this.refs.input.blur();
      events.addEventsToDocument(this.getMouseEventMap());
      this.start(events.getMousePosition(event));
      events.pauseEvent(event);
    };

    handleMouseMove = (event) => {
      events.pauseEvent(event);
      this.move(events.getMousePosition(event));
    };

    handleMouseUp = () => {
      this.end(this.getMouseEventMap());
    };

    handleResize = (event, callback) => {
      const {left, right} = ReactDOM.findDOMNode(this.refs.progressbar).getBoundingClientRect();
      const cb = (callback) || (() => {});
      this.setState({sliderStart: left, sliderLength: right - left}, cb);
    };

    handleSliderBlur = () => {
      events.removeEventsFromDocument(this.getKeyboardEvents());
    };

    handleSliderFocus = () => {
      events.addEventsToDocument(this.getKeyboardEvents());
    };

    handleTouchEnd = () => {
      this.end(this.getTouchEventMap());
    };

    handleTouchMove = (event) => {
      this.move(events.getTouchPosition(event));
    };

    handleTouchStart = (event) => {
      if (this.state.inputFocused) this.refs.input.blur();
      this.start(events.getTouchPosition(event));
      events.addEventsToDocument(this.getTouchEventMap());
      events.pauseEvent(event);
    };

    addToValue (increment) {
      let value = this.state.inputFocused ? parseFloat(this.state.inputValue) : this.props.value;
      value = this.trimValue(value + increment);
      if (value !== this.props.value) this.props.onChange(value);
    }

    getKeyboardEvents () {
      return {
        keydown: this.handleKeyDown
      };
    }

    getMouseEventMap () {
      return {
        mousemove: this.handleMouseMove,
        mouseup: this.handleMouseUp
      };
    }

    getTouchEventMap () {
      return {
        touchmove: this.handleTouchMove,
        touchend: this.handleTouchEnd
      };
    }

    end (revents) {
      events.removeEventsFromDocument(revents);
      this.setState({ pressed: false });
    }

    knobOffset () {
      const { max, min } = this.props;
      return this.state.sliderLength * (this.props.value - min) / (max - min);
    }

    move (position) {
      const newValue = this.positionToValue(position);
      if (newValue !== this.props.value) this.props.onChange(newValue);
    }

    positionToValue (position) {
      const { sliderStart: start, sliderLength: length } = this.state;
      const { max, min } = this.props;
      return this.trimValue((position.x - start) / length * (max - min) + min);
    }

    start (position) {
      this.handleResize(null, () => {
        this.setState({pressed: true});
        this.props.onChange(this.positionToValue(position));
      });
    }

    stepDecimals () {
      return (this.props.step.toString().split('.')[1] || []).length;
    }

    trimValue (value) {
      if (value < this.props.min) return this.props.min;
      if (value > this.props.max) return this.props.max;
      return utils.round(value, this.stepDecimals());
    }

    valueForInput (value) {
      const decimals = this.stepDecimals();
      return decimals > 0 ? value.toFixed(decimals) : value.toString();
    }

    renderSnaps () {
      if (this.props.snaps) {
        return (
          <div ref='snaps' className={this.props.theme.snaps}>
            {utils.range(0, (this.props.max - this.props.min) / this.props.step).map(i => {
              return <div key={`span-${i}`} className={this.props.theme.snap} />;
            })}
          </div>
        );
      }
    }

    renderInput () {
      if (this.props.editable) {
        const value = this.state.inputFocused ? this.state.inputValue : this.valueForInput(this.props.value);
        return (
          <Input
            ref='input'
            className={this.props.theme.input}
            onFocus={this.handleInputFocus}
            onChange={this.handleInputChange}
            onBlur={this.handleInputBlur}
            value={value}
            />
        );
      }
    }

    render () {
      const { theme } = this.props;
      const knobStyles = prefixer({transform: `translateX(${this.knobOffset()}px)`});
      const className = classnames(theme.slider, {
        [theme.editable]: this.props.editable,
        [theme.pinned]: this.props.pinned,
        [theme.pressed]: this.state.pressed,
        [theme.ring]: this.props.value === this.props.min
      }, this.props.className);

      return (
        <div
          className={className}
          data-react-toolbox='slider'
          onBlur={this.handleSliderBlur}
          onFocus={this.handleSliderFocus}
          tabIndex='0'
          >
          <div
            ref='slider'
            className={theme.container}
            onMouseDown={this.handleMouseDown}
            onTouchStart={this.handleTouchStart}
            >
            <div
              ref='knob'
              className={theme.knob}
              onMouseDown={this.handleMouseDown}
              onTouchStart={this.handleTouchStart}
              style={knobStyles}
              >
              <div className={theme.innerknob} data-value={parseInt(this.props.value)}></div>
            </div>

            <div className={theme.progress}>
              <ProgressBar
                ref='progressbar'
                className={theme.innerprogress}
                max={this.props.max}
                min={this.props.min}
                mode='determinate'
                value={this.props.value}
                />
              {this.renderSnaps()}
            </div>
          </div>

          {this.renderInput()}
        </div>
      );
    }
  }

  return Slider;
};

const Slider = factory(InjectProgressBar, InjectInput);
export default themr('ToolboxSlider')(Slider);
export { Slider };
