import {PidController} from "./pid";

type Attrs = Record<string, any>;

class DomBuilder {
    controller: any;
    currElem: HTMLElement;
    constructor(controller: any, container: HTMLElement) {
        this.controller = controller;
        this.currElem = container;
    }
    protected createElem(tag: string, attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        let elem = document.createElement(tag);
        if (ref) {
            this.controller[ref] = elem;
        }
        if (attrs) {
            for (let name in attrs) {
                if (name.startsWith("_")) {
                    if (name.length === 1) {
                        elem.innerText = attrs[name];
                    } else if (name === "_x") {
                        elem.innerHTML = attrs[name];
                    }
                } else {
                    elem.setAttribute(name, attrs[name]);
                }
            }
        }
        if (setup) {
            setup(elem);
        }
        return elem;
    }
    text(txt: string, ref?: string) {
        let elem = document.createTextNode(txt);
        if (ref) {
            this.controller[ref] = elem;
        }
        this.currElem.appendChild(elem);
        return this;
    }
    sub(tag: string, attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        let elem = this.createElem(tag, attrs, ref, setup);
        this.currElem.appendChild(elem);
        this.currElem = elem;
        return this;
    }
    table(attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        return this.sub("table", attrs, ref, setup);
    }
    row(attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        return this.sub("tr", attrs, ref, setup);
    }
    cell(attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        return this.sub("td", attrs, ref, setup);
    }
    rowCell(attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        return this.row()
                     .cell(attrs, ref, setup)
                     .up()
                   .up();
    }
    cellTag(tag: string, attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        return this.cell()
                     .tag(tag, attrs, ref, setup)
                     .up();
    }
    rowCellTag(tag: string, attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        return this.row()
                     .cell()
                       .tag(tag, attrs, ref, setup)
                       .up()
                     .up();
    }
    tag(tag: string, attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        let elem = this.createElem(tag, attrs, ref, setup);
        this.currElem.appendChild(elem);
        return this;
    }
    up(tag?: string) {
        if (tag) {
            tag = tag.toUpperCase();
            for (let parent = this.currElem.parentElement; parent; parent = parent.parentElement) {
                if (parent.tagName == tag) {
                    this.currElem = parent;
                    return this;
                }
            }
        }
        let parent = this.currElem.parentElement;
        if (!parent) {
            throw new Error("up: No parent element");
        }
        this.currElem = parent;
        return this;
    }
}
function numVal(elem: HTMLInputElement) {
    let n = parseFloat(elem.value);
    if (isNaN(n)) {
        throw new Error("Not a number");
    }
    return n;
}
function pidValToString(val: number) {
    return (val < 0) ? val.toPrecision(6) : (' ' + val.toPrecision(6));
}
export class PidControllerGui {
    pid: PidController;
    overshoot: number|null = null;
    lastError: number|null = null;
    enabled: boolean = false;
    kPInput!: HTMLInputElement;
    kIInput!: HTMLInputElement;
    kDInput!: HTMLInputElement;
    intgLimitPInput!: HTMLInputElement;
    intgStartPInput!: HTMLInputElement;
    intgLimitNInput!: HTMLInputElement;
    intgStartNInput!: HTMLInputElement;
    enableChk!: HTMLInputElement;
    titleDisplay!: HTMLElement;
    sliderTitleDisplay!: HTMLElement;
    setpointSlider!: HTMLInputElement;
    sliderValMul!: number;
    setpointDisplay!: HTMLElement;
    pidParamsTable!: HTMLTableElement;
    errDisplay!: HTMLElement;
    outDisplay!: HTMLElement;
    pDisplay!: HTMLInputElement;
    iDisplay!: HTMLInputElement;
    dDisplay!: HTMLInputElement;
    overshootDisplay!: HTMLInputElement;
    isLimiter?: boolean;
    pvFunc!: Function;
    pv?: number;
    outputDelayFactor?: number;
    output: number|null = null;
    onEnabled = (ena: boolean) => {}
    constructor(kP: number, kI: number, kD: number, setpoint: number, isLimiter?: boolean) {
        this.isLimiter = isLimiter;
        this.pid = new PidController(kP, kI, kD, setpoint);
    }
    setPvFunc(pvFunc: Function) {
        this.pvFunc = pvFunc;
    }
    createGui(cont: HTMLElement, title: string, sliderTitle: string, maxVal: number, sliderValMul?: number) {
        this.sliderValMul = sliderValMul || 10;
        let builder = new DomBuilder(this, cont);
        builder
        .table()
          .row()
            .cell({colspan: 3})
              .tag("input", {type: "checkbox"}, "enableChk",
                  (input: HTMLInputElement) => input.addEventListener("change", () => {
                      this.enabled = input.checked;
                      this.onEnabled(this.enabled);
                  }))
              .tag("div", {_: title, style: "display:inline"}, "titleDisplay")
              .up()
            .up()
          .row()
            .cell()
              .tag("div", {_: sliderTitle, style: "display:inline"}, "sliderTitleDisplay")
              .tag("input", {type: "range", min: 0, max: maxVal*this.sliderValMul, value: this.pid.setpoint*this.sliderValMul}, "setpointSlider",
                   (input: HTMLInputElement) => input.addEventListener("input", this.updateSetpoint.bind(this)))
              .up()
            .cell({_: this.pid.setpoint, style: "width: 4ch"}, "setpointDisplay")
              .up()
            .up()
          .row()
            .cell({colspan: 3})
              .table({class: "pidParamsTable", width: "100%"}, "pidParamsTable")
                .row()
                  .cell({_: "kP"})
                    .tag("input", {class: "pidConstInput", value: this.pid.kP}, "kPInput", (input: HTMLElement) => input.addEventListener("change", this.updatePidConstants.bind(this)))
                    .up()
                  .cell({_: "kI"})
                    .tag("input", {class: "pidConstInput", value: this.pid.kI}, "kIInput", (input: HTMLElement) => input.addEventListener("change", this.updatePidConstants.bind(this)))
                    .up()
                  .cell({_: "kD"})
                    .tag("input", {class: "pidConstInput", value: this.pid.kD}, "kDInput", (input: HTMLElement) => input.addEventListener("change", this.updatePidConstants.bind(this)))
                    .up()
                .up()
                .row()
                  .cell({colspan: 3})
                    .table({class: "pidParamsTable", width: "100%"})
                      .row()
                        .cell({_: "ILimP"})
                          .tag("input", {class: "pidConstInput", value: this.pid.intgLimitP}, "intgLimitPInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
                          .up()
                        .cell({_: "IStartP"})
                          .tag("input", {class: "pidConstInput", value: this.pid.intgStartP}, "intgStartPInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
                          .up()
                        .up()
                      .row()
                        .cell({_: "ILimN"})
                          .tag("input", {class: "pidConstInput", value: this.pid.intgLimitN}, "intgLimitNInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
                          .up()
                        .cell({_: "IStartN"})
                          .tag("input", {class: "pidConstInput", value: this.pid.intgStartN}, "intgStartNInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
                    .up("table")
              .up("table")
          .up("table")
          .row()
            .cell({colspan:3, _x: "err:&nbsp;"})
              .tag("div", {class: "inl"}, "errDisplay")
              .up()
            .up()
          .row()
            .cell({colspan:3, _x: "p:&nbsp;"})
              .tag("div", {class: "inl"}, "pDisplay")
              .up()
            .up()
          .row()
            .cell({colspan:3, _x: "i:&nbsp;"})
              .tag("div", {class: "inl"}, "iDisplay")
              .up()
            .up()
          .row()
            .cell({colspan:3, _x: "d:&nbsp;"})
              .tag("div", {class: "inl"}, "dDisplay")
              .up()
            .up()
            .row()
          .cell({colspan:3, _x: "out:&nbsp;"})
              .tag("div", {class: "inl"}, "outDisplay")
              .up()
            .up()
         .row()
            .cell({colspan:3, _x: "over/under:"})
              .tag("div", {class: "inl"}, "overshootDisplay")
              .up()
            .up()
          .up()
        .up();
        this.updateIntgConfig();
    }
    reconfigSetpointSlider(maxVal: number, sliderMul: number) {
        let oldVal = parseInt(this.setpointSlider.value) / this.sliderValMul;
        this.sliderValMul = sliderMul;
        this.setpointSlider.setAttribute("max", (maxVal * this.sliderValMul).toString());
        this.setpointSlider.value = (oldVal * sliderMul).toString();
        this.setpointDisplay.innerText = oldVal.toFixed(Math.log10(this.sliderValMul));
    }
    reconfigureGains(kP: number, kI: number, kD: number) {
        this.pid.setGains(kP, kI, kD);
        this.kPInput.value = kP.toString();
        this.kIInput.value = kI.toString();
        this.kDInput.value = kD.toString();
    }
    setIntegralLimits(limP: number, startP: number, limN?: number, startN?: number) {
        let pid = this.pid;
        pid.setIntegralLimits(limP, startP, limN, startN);
        this.intgLimitPInput.value = pid.intgLimitP.toString();
        this.intgStartPInput.value = pid.intgStartP.toString();
        this.intgLimitNInput.value = pid.intgLimitN.toString();
        this.intgStartNInput.value = pid.intgStartN.toString();
    }
    updatePidConstants() {
        this.pid.setGains(numVal(this.kPInput), numVal(this.kIInput), numVal(this.kDInput));
    }
    updateIntgConfig() {
        this.pid.setIntegralLimits(
            numVal(this.intgLimitPInput), numVal(this.intgStartPInput),
            numVal(this.intgLimitNInput), numVal(this.intgStartNInput)
        );
    }
    updateSetpoint() {
        if (!this.isEnabled()) {
            this.enableChk.checked = this.enabled = true;
            this.onEnabled(true);
        }
        let value = parseInt(this.setpointSlider.value) / this.sliderValMul;
        this.setpointDisplay.innerText = value.toFixed(Math.log10(this.sliderValMul));
        this.pid.setTarget(value);
        this.overshoot = null;
    }
    handleOutput(output: number) {
        let pid = this.pid;
        if (this.outputDelayFactor) {
            if (this.output != null) {
                output = (this.output * this.outputDelayFactor + output) / (this.outputDelayFactor+1);
            } else {
                this.output = output;
            }
        }
        if (output > 1) {
            output = 1;
        } else if (output < 0) {
            output = 0;
        }
        this.output = output;

        if ((this.lastError != null) && (pid.error * this.lastError < 0)) { // error sign changed
            this.overshoot = 0;
        } else if (this.overshoot != null) {
            let absError = Math.abs(pid.error);
            if (absError > this.overshoot) {
                this.overshoot = absError;
            }
        }
        this.lastError = pid.error;

        this.errDisplay.innerText = pidValToString(pid.error);
        this.pDisplay.innerText = pidValToString(pid.proportional);
        this.iDisplay.innerText = pidValToString(pid.integral);
        this.dDisplay.innerText = pidValToString(pid.derivative);
        this.outDisplay.innerText = pidValToString(output);
        this.overshootDisplay.innerText = (this.overshoot == null)
            ? "N/A"
            : pidValToString(this.overshoot * Math.sign(-this.lastError));
        return output;
    }
    isEnabled() {
        return this.enabled;
    }
    process(dt: number) {
        let pv = this.pv = this.pvFunc();
        return this.handleOutput(this.pid.loop(pv, dt));
    }
    processLim(inThrottle: number, dt: number) {
        let pv = this.pv = this.pvFunc();
        let output = this.pid.loop(pv, dt);
        if (output > inThrottle) {
            output = inThrottle;
        }
        return this.handleOutput(output);
    }
    reset() {
        this.pid.reset();
        this.overshoot = null;
    }
}
