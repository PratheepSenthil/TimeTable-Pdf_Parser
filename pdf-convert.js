var { parsePdf } = require('easy-pdf-parser')
var myArgs = process.argv.slice(2);
var file = myArgs[0]
parsePdf('./' + file).then(data => {
    jso = data.formImage.Pages[0].Texts;
    var tt = getTT(jso);
    var fs = require('fs');
    fs.writeFile(file.split(".")[0]+'.json',JSON.stringify(tt, '', 2), function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
});

function getTT(jso) {
    var i, j, k;

    for (i = 0; i < jso.length; i++) {
        jso[i].R[0].T = decodeURIComponent(jso[i].R[0].T)
    }

    tty = getWeekDaysY(jso);
    
    //Select Periods in each row
    tt = [[], [], [], [], [], []]
    err = 0.5
    for (i = 0; i < jso.length; i++) {
        for (j = 0; j < tty.length; j++) {
            if (jso[i].y > tty[j] - err && jso[i].y < tty[j] + err) {
                tt[j].push(jso[i])
            }
        }
    }

    //To sort X
    for (i = 0; i < tt.length; i++) {
        tt[i].sort(function (a, b) {
            var x1 = a.x; var x2 = b.x;
            if (x1 < x2)
                return -1

            if (x2 > x1)
                return 1
            return 0
        })
    }

    //To append proper periods
    var pat = /.*(\.|\/)\s*$/;
    for (i = 0; i < tty.length; i++) {
        for (j = 0; j < tt[i].length; j++) {
            if (pat.test(tt[i][j].R[0].T)) {
                var pat2 = /.*(\.|\/)/;
                var res = pat2.exec(tt[i][j].R[0].T)
                tt[i][j].R[0].T = res[0] + tt[i][j + 1].R[0].T;
                tt[i].splice(j + 1, 1)
            }
        }
    }
    
    var perTime = getPeriodTime(jso);
    // console.log(perTime);
    var subInfo = getSubInfo(jso);
    tt = getPeriodNo(jso,tt);
 
    finalTT = {};
    finalTT.SubjectInfo = subInfo;
    dayName = ["MON","TUE","WED","THU","FRI","SAT"];

    var allDays = {};
    for(i = 0;i<tt.length;i++){
        oneDay = [];
        for(j = 1; j<tt[i].length;j++){
            var onePeriod ={};
            onePeriod.PeriodStartingNo = tt[i][j].period;
            for(k = 0;k<perTime.length;k++){
                if(perTime[k].no === tt[i][j].period){
                    onePeriod.startTime = perTime[k].startTime;
                    onePeriod.endTime = perTime[k].endTime;
                }
            }
            pat = /([A-Z]+[0-9]+)(\/[A-Z]+[0-9]+)*/;
            var res = pat.exec(tt[i][j].R[0].T);
            if(res){
                onePeriod.SubjectCode = res[0];
            }
            else{
                onePeriod.SubjectCode = tt[i][j].R[0].T;
            }
            oneDay.push(onePeriod);
        }
        allDays[""+dayName[i]+""] = oneDay;
    }
    finalTT.TimeTable = allDays;
    return finalTT; 

}

//Get Y of all days
function getWeekDaysY(jso){
    var tty = [],i,j;
    
    dayName = ["MON","TUE","WED","THU","FRI","SAT"];
    for (i = 0; i < jso.length; i++) {
        for(j = 0;j<dayName.length;j++){
            if(jso[i].R[0].T === dayName[j]){
                tty[j] = jso[i].y;
            }
        }
    }
    return tty;
}

//Print all text with x and y
function printAll(jso){
    var i;
    for(i = 0;i<jso.length;i++){
        console.log(jso[i].R[0].T)
        console.log(jso[i].x)
        console.log(jso[i].y)
    }
}

// Print TimeTable
function printTT(tt){
    var i,j;
    for (i = 0; i < tt.length; i++) {
        console.log(i + 1 + ":::::::")
        for (j = 0; j < tt[i].length; j++) {
            console.log(tt[i][j].R[0].T)
            console.log(tt[i][j].period)
        }    
    }
}

function getPeriodNo(jso,tt){
    var i,j,k;
    var err = 2

    var px = getPX(jso);
    for (i = 0; i < tt.length; i++) {
        for (j = 0; j < tt[i].length; j++) {
            for(k = 0;k<px.length;k++){
                if (tt[i][j].x > px[k] - err && tt[i][j].x < px[k] + err) {
                    tt[i][j].period = k+1
                }
            }
            
        }
    }
    return tt;
}

function getPeriodTime(jso){
    var px = getPX(jso);
    
    var times = [],i,j;
    for(i = 0; i < jso.length ;i++){
        var pat = /^((\d)+\.(\d){2})-?((\d)+.(\d){2})?$/;
        if (pat.test(jso[i].R[0].T)){
            times.push(jso[i]);
        }
    }
    times.sort(function (a,b){
        var y1 = a.x;
        var y2 = b.x;

        if(y1 < y2)
            return -1;
        if(y1 > y2)
            return 1;
        return 0;
    })
    
    for(i = 0; i < times.length ;i++){
        var pat2 = /[0-9\.]+-$/i;
        if(pat2.test(times[i].R[0].T)){
            times[i].R[0].T = times[i].R[0].T + times[i+1].R[0].T
            times.splice(i+1,1)
        }
    }
    
    var retTimes = []
    var err = 2.3;
    var cnt = 1;
    for(i=0;i<times.length;i++){
        var period = {};
        var flag = false;
        for(j = 0;j<px.length;j++){
            if(times[i].x > px[j] - err && times[i].x < px[j] + err){
                period.no = j+1;
                var t = times[i].R[0].T.split("-")
                period.startTime = t[0];
                period.endTime = t[1];
                retTimes.push(period);
                flag = true;
            }
        }
        if(!flag){
            period.no = "Break"+cnt;
            var t = times[i].R[0].T.split("-")
            period.startTime = t[0];
            period.endTime = t[1];
            retTimes.push(period);
            cnt++; 
        }
    }

    return retTimes;
}

function getPX(jso){
    px =[]
    for (i = 0; i < jso.length; i++) {
        // console.log(jso[i].R[0].T)
        switch (jso[i].R[0].T) {
            case "1":
                px[0] = jso[i].x
                break;
            case "2":
                px[1] = jso[i].x
                break;
            case "3":
                px[2] = jso[i].x
                break;
            case "4":
                px[3] = jso[i].x
                break;
            case "5":
                px[4] = jso[i].x
                break;
            case "6":
                px[5] = jso[i].x
                break;
            case "7":
                px[6] = jso[i].x
                break;
            case "8":
                px[7] = jso[i].x
                break;
        }
        if(px[7])
            break;
    }
    return px;
}

function getSubInfo(jso){
    var subInfo=[];
    var i,j;

    pat = /^(PC|PE|BS|HS|ES|OE|EEC)$/;
    pat2 = /^([A-Z]+\s)+([A-Z]+)$/;
    pat3 = /^[A-Z]+[0-9]+$/;
    pat4 = /^([A-Z]+(\/|\s&\s)?)+([A-Z]+)$/;
    pat5 = /^((DR\.|MS\.)[A-Z\.\s]+(\/(\s)*|\s&\s)?)+$/;
    pat6 = /^[0-9\.]+$/;
    
    // Get y for all subjects
    var suby = []
    for(i=0;i<jso.length;i++){
        if(pat.test(jso[i].R[0].T)){
            suby.push(jso[i].y);
        }
    }

    // Get collection of Subjects
    var subCollection = [];
    var err = 0.5;
    for(j = 0;j<suby.length;j++){
        var subs = [];
        for(i = 0;i<jso.length;i++){
            if(jso[i].y > suby[j]-err && jso[i].y < suby[j]+err){
                subs.push(jso[i].R[0].T);
            } 
        }
        subCollection.push(subs); 
    }


   // Join Faculty Names
    for(i = 0; i<subCollection.length;i++){
        var profsName =[]
        for(j = 0;j<subCollection[i].length;j++){
            if(pat5.test(subCollection[i][j])){
                pat7 = /((DR\.|MS\.)[A-Z\.\s]+(\s&\s)?)+/;
                profsName.push(pat7.exec(subCollection[i][j])[0]);
                subCollection[i][j] = "Del";
            }
        }
        Name = profsName.join("/");
        subCollection[i].push(Name);
    }
    
    // Make SubjectObject
    for(i = 0; i<subCollection.length;i++){
        var subObj ={};
        
        for(j = 0;j<subCollection[i].length;j++){
            if(pat.test(subCollection[i][j])){
                subObj.Category = subCollection[i][j];
            }
            else if(pat2.test(subCollection[i][j])){
                subObj.SubjectName = subCollection[i][j];
            }
            else if(pat3.test(subCollection[i][j])){
                subObj.SubjectCode = subCollection[i][j];
            }
            else if(pat4.test(subCollection[i][j])){
                subObj.StaffInitial = subCollection[i][j];
            }
            else if (pat5.test(subCollection[i][j])){
                subObj.StaffName = subCollection[i][j];
            }
            else if (pat6.test(subCollection[i][j])){
                subObj.Credit = subCollection[i][j];
            }
        }
        subInfo.push(subObj);
    }
    return subInfo;
}
 