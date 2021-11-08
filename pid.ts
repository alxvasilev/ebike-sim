export interface Pid {
    kP: number;
    kI: number;
    kD: number;
    setpoint: number;
    error: number;
    proportional: number;
    integral: number;
    derivative: number;
    isLimiter?: boolean;
    setTarget(val: number): void;
    setGains(kP: number, kI: number, kD: number): void;
    reset(): void;
}
export class PidController implements Pid {
    prevPv!: number;
    integral!: number;
    intgLimitP: number = 100000000;
    intgLimitN: number = -100000000;
    intgStartP: number = 100000000;
    intgStartN: number = -100000000;
    setpoint: number;
    kP!: number;
    kI!: number;
    kD!: number;
    //debug
    proportional!: number;
    derivative!: number;
    error!: number;
    constructor(kP: number, kI: number, kD: number, setpoint: number) {
        this.setpoint = setpoint;
        this.setGains(kP, kI, kD);
    }
    setIntegralLimits(intgLimitP?: number, intgStartP?: number, intgLimitN?: number, intgStartN?: number) {
        if (intgLimitP != null) this.intgLimitP = intgLimitP;
        if (intgStartP != null) this.intgStartP = intgStartP;
        if (intgLimitN != null) this.intgLimitN = intgLimitN;
        if (intgStartN != null) this.intgStartN = intgStartN;
    }
    reset() {
        this.prevPv = this.integral = 0.0;
    }
    loop(pv: number, dt: number): number {
        let error = this.setpoint - pv;
        let proportional = (this.kP * error);
        if (error > this.intgStartP || error < this.intgStartN) {
            this.integral = 0;
        } else {
            this.integral += error * dt * this.kI;
            if (this.integral > this.intgLimitP) {
                this.integral = this.intgLimitP;
            } else if (this.integral < this.intgLimitN) {
                this.integral = this.intgLimitN;
            }
        }
        let derivative = this.kD * (pv - this.prevPv) / dt;
        let output = proportional + this.integral + derivative;
        this.prevPv = pv;
        // debug
        this.proportional = proportional;
        this.derivative = derivative;
        this.error = error;
        return output;
    }
    setTarget(val: number) {
        this.setpoint = val;
        this.reset();
    }
    setGains(kP: number, kI: number, kD: number) {
        this.kP = kP;
        this.kI = kI;
        this.kD = kD;
        this.reset();
    }
}
export class PidLimiter implements Pid {
    prevPv!: number;
    integral!: number;
    derivative = 0;
    setpoint: number;
    kP!: number;
    kI!: number;
    kD!: number;
    intgStart: number = 1;
    intgLimit: number = 1;
    isLimiter = true;
    //debug
    proportional: number = 0;
    error: number = 0;
    constructor(kP: number, kI: number, kD: number, setpoint: number) {
        this.setpoint = setpoint;
        this.setGains(kP, kI, kD);
    }
    setGains(kP: number, kI: number, kD: number) {
        this.kP = kP;
        this.kI = kI;
        this.kD = kD;
        this.reset();
    }
    setIntegralLimits(intgLimit?: number, intgStart?: number) {
        if (intgLimit != null) this.intgLimit = intgLimit;
        if (intgStart != null) this.intgStart = intgStart;
    }
    reset() {
        this.prevPv = this.integral = 0.0;
    }
    loop(input: number, pv: number, dt: number): number {
        let error = this.setpoint - pv;
        if (Math.abs(error) > this.intgStart) {
            this.integral = 0;
        } else {
            this.integral += error * dt * this.kI;
            if (Math.abs(this.integral) > this.intgLimit) {
                this.integral = this.intgLimit * Math.sign(this.integral);
            }
        }
        if (error >= 0) {
            return input;
        }
        let proportional = (this.kP * error);
        // debug
        this.proportional = proportional;
        this.error = error;
        return input + proportional + this.integral;
    }
    setTarget(val: number) {
        this.setpoint = val;
        this.reset();
    }
}
