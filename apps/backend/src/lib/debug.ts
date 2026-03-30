export abstract class Debuggable {
    protected readonly debug: Debug;
    
    constructor(
    ) {
        this.debug = new Debug(this);
    }
}

export class Debug {
    constructor(
        private ctx: Debuggable,
        private debugMode: boolean = process.env.LOG_LEVEL === "debug"
    ) {
    }

    private prefix(phase: string): string {
        return `[${this.ctx.constructor.name}]:[${phase}]`;
    }

    /**
     * ## Start
     * Logs the start of an action or process. 
     * This is typically used at the beginning of a method or operation to indicate that it has started. 
     * The `action` parameter should describe what is being started, and any additional arguments can provide context or details about the action.
     */
    public start(action: string, ...args: unknown[]) {
        if (this.debugMode) {
            console.info(`${this.prefix("START")} ${action}`, ...args);
        }
    }

    /**
     * ## Step
     * Logs a step or intermediate action within a process. 
     * This can be used to indicate progress through different stages of an operation, or to log important checkpoints. 
     * The `action` parameter should describe the step being taken, and any additional arguments can provide context or details about the step.
     */
    public step(action: string, ...args: unknown[]) {
        if (this.debugMode) {
            console.debug(`${this.prefix("STEP")} ${action}`, ...args);
        }
    }

    /**
     * ## Info
     * Logs informational messages that are useful for understanding the flow of the application or the state of the system. 
     * This can include successful completion of steps, important variable values, or any other information that might be helpful for debugging or monitoring. 
     * The `action` parameter should describe the information being logged, and any additional arguments can provide context or details about the information.
     */
    public info(action: string, ...args: unknown[]) {
        if (this.debugMode) {
            console.info(`${this.prefix("INFO")} ${action}`, ...args);
        }
    }

    /**
     * ## Warn
     * Logs warning messages that indicate potential issues or important conditions that should be noted. 
     * This can include unexpected states, deprecated usage, or any other situation that might not be an error but is still noteworthy. 
     * The `action` parameter should describe the warning being logged, and any additional arguments can provide context or details about the warning.
     */
    public warn(action: string, ...args: unknown[]) {
        console.warn(`${this.prefix("WARN")} ${action}`, ...args);
    }

    /**
     * ## Error
     * Logs error messages that indicate a failure or problem that occurred during the execution of an action. 
     * This should be used when an error occurs that might require attention or investigation. 
     * The `action` parameter should describe the error being logged, and any additional arguments can provide context or details about the error, such as error objects or relevant variables.
     */
    public error(action: string, ...args: unknown[]) {
        console.error(`${this.prefix("ERROR")} ${action}`, ...args);
    }

    /**
     * ## Finish
     * Logs the completion of an action or process. 
     * This is typically used at the end of a method or operation to indicate that it has finished. 
     * The `action` parameter should describe what has been completed, and any additional arguments can provide context or details about the completion, such as results or final states.
     */
    public finish(action: string, ...args: unknown[]) {
        if (this.debugMode) {
            console.info(`${this.prefix("FINISH")} ${action}`, ...args);
        }
    }
}