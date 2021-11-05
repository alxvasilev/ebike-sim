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
                if (name === "_") {
                    elem.innerText = attrs[name];
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
        return this.sub("row", attrs, ref, setup);
    }
    cell(attrs?: Attrs|null, ref?: string|null, setup?: Function) {
        return this.sub("cell", attrs, ref, setup);
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

export class PidBaseGui {
    id: string;
    pid: Pid;
    kPInput!: HTMLInputElement;
    kIInput!: HTMLInputElement;
    kDInput!: HTMLInputElement;
    enableChk!: HTMLInputElement;
    setpointSlider!: HTMLInputElement;
    setpointDisplay!: HTMLElement;
    pidParamsTable!: HTMLTableElement;
    errDisplay!: HTMLElement;
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
              .tag("input", {type: "checkbox", _: title}, "enableChk",
                  (input: HTMLInputElement) => input.addEventListener("change", () => {
                    this.onEnabled(input.checked);
                  }))
              .up()
            .cell({_: sliderTitle})
              .tag("input", {type: "range", min: 0, max: maxVal*10, value: this.pid.setpoint*10}, "setpointSlider",
                   (input: HTMLInputElement) => input.addEventListener("change", () => {
                       if (!this.isEnabled()) {
                           this.onEnabled(true);
                       }
                       this.pid.setTarget(parseFloat(input.value));
                    }))
              .up()
            .cell({_: this.pid.setpoint * 10}, "setpointDisplay", (cell: HTMLElement) => cell.style.width="4ch")
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
            .cell({colspan:3, _: "err:&nbsp;"})
              .tag("div", {class: "inl"}, "errDisplay")
              .up()
            .up()
          .row()
            .cell({colspan:3, _: "p:&nbsp;"})
              .tag("div", {class: "inl"}, "pDisplay")
              .up()
            .up()
          .row()
            .cell({colspan:3, _: "i:&nbsp;"})
              .tag("div", {class: "inl"}, "iDisplay")
              .up()
            .up()
          .row()
            .cell({colspan:3, _: "d:&nbsp;"})
              .tag("div", {class: "inl"}, "dDisplay")
              .up()
            .up()
            .row()
          .cell({colspan:3, _: "out:&nbsp;"})
              .tag("div", {class: "inl"}, "outDisplay")
              .up()
            .up()
         .row()
            .cell({colspan:3, _: "over:&nbsp;"})
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
    isEnabled() {
        return this.enableChk.checked;
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
    }
    updateIntgConfig() {
        (this.pid as PidController).setIntegralLimits(numVal(this.intgLimitPInput),
            numVal(this.intgStartPInput),numVal(this.intgLimitNInput));
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
            .up()
    }
    updateIntgConfig() {
        (this.pid as PidLimiter).setIntegralLimits(numVal(this.intgLimitInput), numVal(this.intgStartInput));
    }
}