import {Pid, PidController, PidLimiter} from "./pid";

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
    text(txt: string) {
        this.currElem.appendChild(document.createTextNode(txt));
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
    up() {
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
export class PidBaseGui {
    id: string;
    pid: Pid;
    overshoot: number = 0;
    enabled: boolean = false;
    kPInput!: HTMLInputElement;
    kIInput!: HTMLInputElement;
    kDInput!: HTMLInputElement;
    enableChk!: HTMLInputElement;
    setpointSlider!: HTMLInputElement;
    setpointDisplay!: HTMLElement;
    pidParamsTable!: HTMLTableElement;
    errDisplay!: HTMLElement;
    outDisplay!: HTMLElement;
    pDisplay!: HTMLInputElement;
    iDisplay!: HTMLInputElement;
    dDisplay!: HTMLInputElement;
    overshootDisplay!: HTMLInputElement;
    onEnabled = (ena: boolean) => {}
    constructor(pid: Pid, id: string) {
        this.id = id;
        this.pid = pid;
    }
    createGui(cont: HTMLElement, title: string, sliderTitle: string, maxVal: number) {
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
              .text(title)
              .up()
            .up()
          .row()
            .cell({_: sliderTitle})
              .tag("input", {type: "range", min: 0, max: maxVal*10, value: this.pid.setpoint*10}, "setpointSlider",
                   (input: HTMLInputElement) => input.addEventListener("input", () => {
                       if (!this.isEnabled()) {
                           this.enableChk.checked = this.enabled = true;
                           this.onEnabled(true);
                       }
                       let value = parseInt(input.value) / 10;
                       this.setpointDisplay.innerText = value.toFixed(1);
                       this.pid.setTarget(value);
                    }))
              .up()
            .cell({_: this.pid.setpoint}, "setpointDisplay", (cell: HTMLElement) => cell.style.width="4ch")
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
                .row(null, "IConfigGui")
                   .up()
                .up()
              .up() // table
            .up() // cell
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
            .cell({colspan:3, _x: "over:&nbsp;"})
              .tag("div", {class: "inl"}, "overshootDisplay")
              .up()
            .up()
          .up()
        .up();
    }
    updatePidConstants() {
        this.pid.setGains(numVal(this.kPInput), numVal(this.kIInput), numVal(this.kDInput));
    }
    updateSetpoint() {
        let val = numVal(this.setpointSlider);
        this.pid.setTarget(val);
        this.setpointDisplay.innerText = val.toString();
    }
    handleOutput(output: number) {
        let pid = this.pid;
        if (output > 1) {
            output = 1;
        } else if (output < 0) {
            output = 0;
        }
        if (pid.error > 0) {
            this.overshoot = 0;
        } else {
            if (-pid.error > this.overshoot) {
                this.overshoot = -pid.error;
            }
        }
        this.errDisplay.innerText = pidValToString(pid.error);
        this.pDisplay.innerText = pidValToString(pid.proportional);
        this.iDisplay.innerText = pidValToString(pid.integral);
        this.dDisplay.innerText = pidValToString(pid.derivative);
        this.outDisplay.innerText = pidValToString(output);
        this.overshootDisplay.innerText = pidValToString(this.overshoot);
        return output;
    }
    isEnabled() {
        return this.enabled;
    }
}

export class PidControllerGui extends PidBaseGui {
    intgLimitPInput!: HTMLInputElement;
    intgStartPInput!: HTMLInputElement;
    intgLimitNInput!: HTMLInputElement;
    constructor(id: string, kP: number, kI: number, kD: number, setpoint: number) {
        super(new PidController(kP, kI, kD, setpoint), id);
    }
    createGui(cont: HTMLElement, title: string, sliderTitle: string, maxVal: number) {
        super.createGui(cont, title, sliderTitle, maxVal);
        new DomBuilder(this, (this as any).IConfigGui)
          .cell({_: "ILimP"})
            .tag("input", {class: "pidConstInput", value: 1.0}, "intgLimitPInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
            .up()
          .cell({_: "IStartP"})
            .tag("input", {class: "pidConstInput", value: 2.5}, "intgStartPInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
            .up()
          .cell({_: "ILimN"})
            .tag("input", {class: "pidConstInput", value: 0.0}, "intgLimitNInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
            .up();
        this.updateIntgConfig();
    }
    updateIntgConfig() {
        (this.pid as PidController).setIntegralLimits(numVal(this.intgLimitPInput),
            numVal(this.intgStartPInput),numVal(this.intgLimitNInput));
    }
    process(input: number, dt: number) {
        let pid = this.pid as PidController;
        let output = pid.loop(input, dt);
        return this.handleOutput(output);
    }
}
export class PidLimiterGui extends PidBaseGui {
    intgLimitInput!: HTMLInputElement;
    intgStartInput!: HTMLInputElement;
    constructor(id: string, kP: number, kI: number, kD: number, setpoint: number) {
        super(new PidLimiter(kP, kI, kD, setpoint), id);
    }
    createGui(cont: HTMLElement, title: string, sliderTitle: string, maxVal: number) {
        super.createGui(cont, title, sliderTitle, maxVal);
        new DomBuilder(this, (this as any).IConfigGui)
          .cell({_: "ILim"})
            .tag("input", {class: "pidConstInput", value: 1.0}, "intgLimitInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
            .up()
          .cell({_: "IStart"})
            .tag("input", {class: "pidConstInput", value: 2.5}, "intgStartInput", (input: HTMLElement) => input.addEventListener("change", this.updateIntgConfig.bind(this)))
            .up();
        this.updateIntgConfig();
    }
    updateIntgConfig() {
        (this.pid as PidLimiter).setIntegralLimits(numVal(this.intgLimitInput), numVal(this.intgStartInput));
    }
}
