const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const ClosestSchedule = (now, schedule) => {
    let nextUpdateSeconds = Infinity;
    let scheduleIdx = -1;
    schedule.forEach((ele, idx) => {
        const scheduleObject = JSON.parse(ele);
        const totalSecondsSchedule = scheduleObject['hour'] * 60 * 60 + scheduleObject['minute'] * 60;
        let nextUpdateDiff = totalSecondsSchedule - now;
        if(nextUpdateDiff <= 0 ) nextUpdateDiff = 24 * 60 * 60 + nextUpdateDiff;
        if(nextUpdateDiff > nextUpdateSeconds) return;
        nextUpdateSeconds = nextUpdateDiff;
        scheduleIdx = idx
    });
    return {scheduleIdx, nextUpdateSeconds}
}