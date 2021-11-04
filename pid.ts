class PidController {
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
    proportional?: number;
    derivative?: number;
    error?: number;
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
class PidLimiter {
    prevPv!: number;
    integral!: number;
    setpoint: number;
    kP!: number;
    kI!: number;
    kD!: number;
    intgStart: number = 1;
    intgLimit: number = 1;
    //debug
    proportional?: number;
    derivative?: number;
    error?: number;
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
    loop(pv: number, dt: number): number {
        let error = pv - this.setpoint;
        if (error <= 0) {
            return 0.0;
        }
        let proportional = (this.kP * error);
        if (error > this.intgStart) {
            this.integral = 0;
        } else {
            this.integral += error * dt * this.kI;
            if (this.integral > this.intgLimit) {
                this.integral = this.intgLimit;
            }
        }
        this.prevPv = pv;
        // debug
        this.proportional = proportional;
        this.error = error;
        let output = -proportional - this.integral;

        return output;
    }
    setTarget(val: number) {
        this.setpoint = val;
        this.reset();
    }
}
