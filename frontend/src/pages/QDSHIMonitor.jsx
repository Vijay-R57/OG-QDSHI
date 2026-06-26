import React, { useState, useEffect, useMemo } from 'react';
import './QDSHIMonitor.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Reusable Circle Component
const DailyCircle = ({ letter, selectedMonthIdx, selectedYear }) => {
    const numDots = new Date(selectedYear, selectedMonthIdx + 1, 0).getDate();
    const center = 75;
    const dotRadius = 62;

    const today = new Date();
    const isCurrentMonth = today.getMonth() === selectedMonthIdx && today.getFullYear() === selectedYear;

    const dots = Array.from({ length: numDots }).map((_, i) => {
        const angle = (i / numDots) * 2 * Math.PI - Math.PI / 2;
        const cx = center + dotRadius * Math.cos(angle);
        const cy = center + dotRadius * Math.sin(angle);
        
        let fill = '#fff';
        if (isCurrentMonth) {
            fill = i < today.getDate() ? '#28a745' : '#fff';
        } else if (today > new Date(selectedYear, selectedMonthIdx + 1, 0)) {
            fill = '#28a745'; // past months are all green
        }
        
        return (
            <circle key={i} cx={cx} cy={cy} r={3.5} fill={fill} stroke="#555" strokeWidth="1" />
        );
    });

    return (
        <div className="flex justify-center items-center mb-2">
            <svg width="150" height="150">
                <circle cx={center} cy={center} r={48} fill="#e6e6e6" stroke="#444" strokeWidth="2.5" />
                <circle cx={center} cy={center} r={55} fill="none" stroke="#666" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x={center} y={center} textAnchor="middle" dy=".35em" fontSize="55" fontWeight="800" fill="#222">{letter}</text>
                {dots}
            </svg>
        </div>
    );
};

// Reusable Daily Table
const DailyTable = ({ title, metricHeader, subheaders, colorClass, rowsData, formatCell, getCellClass }) => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    return (
        <div className="board-table-wrapper">
            <div className="table-title">{title}</div>
            <table className="border-collapse border border-slate-300 w-full board-table text-[8.5px]">
                <thead>
                    <tr className={colorClass}>
                        <th rowSpan="2" className="text-center align-middle" style={{width: '28px'}}>Date</th>
                        <th colSpan={subheaders.length} className="text-center">{metricHeader}</th>
                    </tr>
                    <tr className={colorClass}>
                        {subheaders.map((sh, i) => <th key={i} className="text-center">{sh}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {days.map((day, dIdx) => (
                        <tr key={day}>
                            <td className="text-center font-bold text-slate-500">{day}</td>
                            {subheaders.map((_, colIdx) => (
                                <td key={colIdx} className={`text-center font-medium ${getCellClass ? getCellClass(rowsData[dIdx], colIdx) : ''}`}>
                                    {formatCell(rowsData[dIdx], colIdx)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Reusable Issues Table
const IssuesTable = ({ issues }) => {
    const rows = Array.from({ length: 11 }, (_, i) => issues[i] || { date: '', challenge: '', owner: '' });
    return (
        <div className="board-table-wrapper">
            <div className="table-title uppercase" style={{color: '#666'}}>Challenge Board</div>
            <table className="border-collapse border border-slate-300 w-full board-table text-[8.5px]">
                <thead>
                    <tr className="bg-slate-100">
                        <th className="text-center" style={{width: '20%'}}>Time</th>
                        <th className="text-center" style={{width: '50%'}}>Challenge faced</th>
                        <th className="text-center" style={{width: '30%'}}>To be actioned by</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td className="text-center">{r.date || '\u00A0'}</td>
                            <td className="truncate max-w-[50px]">{r.owner}</td>
                            <td className="truncate max-w-[80px]" title={r.challenge}>{r.challenge}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Reusable Action Tracker Table
const ActionTable = ({ actions }) => {
    const rows = Array.from({ length: 8 }, (_, i) => actions[i] || { date: '', action: '', owner: '', target: '', status: '' });
    return (
        <div className="board-table-wrapper">
            <div className="table-title uppercase" style={{color: '#666'}}>Action Tracker Details</div>
            <table className="border-collapse border border-slate-300 w-full board-table text-[8.5px]">
                <thead>
                    <tr className="bg-slate-100">
                        <th className="text-center" style={{width: '15%'}}>Time</th>
                        <th className="text-center" style={{width: '45%'}}>Action</th>
                        <th className="text-center" style={{width: '25%'}}>Owner</th>
                      </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td className="text-center">{r.date || '\u00A0'}</td>                    
                                    <td className="truncate max-w-[30px]">{r.owner}</td>

                            <td className="truncate max-w-[70px]" title={r.action}>{r.action}</td>
                             
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function QDSHIMonitor() {
    const [dept, setDept] = useState('pop'); // Default to post-production based on image
    const [selectedDateStr, setSelectedDateStr] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [metrics, setMetrics] = useState([]);
    const [healthData, setHealthData] = useState([]);
    
    const DEPT_MAP = {
        'fgmw': 'FG Warehouse', 'pmw': 'PM Warehouse', 'rmw': 'RM Warehouse',
        'ppp': 'Primary Packing', 'pop': 'Post-production', 'qcmad': 'QC Lab',
        'pro': 'Production', 'spp': 'Secondary Packing', 'fac': 'Facilities'
    };

    const targetDate = new Date(`${selectedDateStr}-01`);
    const currentMonthIdx = targetDate.getMonth();
    const currentYear = targetDate.getFullYear();
    const currentMonthLong = targetDate.toLocaleString('default', { month: 'long' });

    const [activeCarouselShift, setActiveCarouselShift] = useState('1');
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (isHovered) return;
        const interval = setInterval(() => {
            setActiveCarouselShift(prev => prev === '1' ? '2' : prev === '2' ? '3' : '1');
        }, 5000); // 5 seconds carousel
        return () => clearInterval(interval);
    }, [isHovered]);

    const fetchData = async () => {
        try {
            const [metricsRes, h1, h2, h3] = await Promise.all([
                fetch(`${API}/api/metrics?dept=${dept}`),
                fetch(`${API}/api/health?month=${currentMonthLong}&year=${currentYear}&dept=${dept}&shift=1`),
                fetch(`${API}/api/health?month=${currentMonthLong}&year=${currentYear}&dept=${dept}&shift=2`),
                fetch(`${API}/api/health?month=${currentMonthLong}&year=${currentYear}&dept=${dept}&shift=3`)
            ]);
            
            const metricsJson = await metricsRes.json().catch(() => []);
            const health1 = await h1.json().catch(() => null);
            const health2 = await h2.json().catch(() => null);
            const health3 = await h3.json().catch(() => null);
            
            setMetrics(Array.isArray(metricsJson) ? metricsJson : []);
            setHealthData([health1, health2, health3].filter(Boolean));
            
        } catch (e) {
            console.error("Failed to fetch monitor data", e);
        }
    };
    
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [dept, selectedDateStr]);

    // Derived Data
    const qData = metrics.find(m => m.letter === 'Q') || {};
    const dData = metrics.find(m => m.letter === 'D') || {};
    const sData = metrics.find(m => m.letter === 'S') || {};

    // Q Rows
    const qRows = Array.from({length: 31}, () => (['']));
    const qLogs = qData.shifts?.[activeCarouselShift]?.issueLogs || [];
    qLogs.forEach(log => {
        const d = new Date(log.rawDate);
        if (d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear) {
            const dayIdx = d.getDate() - 1;
            if (dayIdx >= 0 && dayIdx < 31) {
                qRows[dayIdx][0] = log.reason === 'Target Met' ? '✅' : 
                                      log.deviationType === 'Human Error' ? 'HE' : 
                                      log.deviationType === 'Process Error' ? 'PE' : '⚠️';
            }
        }
    });

    // D Rows
    const dRows = Array.from({length: 31}, () => ({ plan: 0, actual: 0 }));
    const dLogs = dData.shifts?.[activeCarouselShift]?.issueLogs || [];
    dLogs.forEach(log => {
        const d = new Date(log.rawDate);
        if (d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear) {
            const dayIdx = d.getDate() - 1;
            if (dayIdx >= 0 && dayIdx < 31) {
                dRows[dayIdx].plan += Number(log.planned) || 0;
                dRows[dayIdx].actual += Number(log.dispatched) || 0;
            }
        }
    });

    // S Rows
    const sRows = Array.from({length: 31}, () => null);
    const sLogs = sData.shifts?.[activeCarouselShift]?.issueLogs || [];
    sLogs.forEach(log => {
        const d = new Date(log.rawDate);
        if (d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear) {
            const dayIdx = d.getDate() - 1;
            if (dayIdx >= 0 && dayIdx < 31) {
                if (!sRows[dayIdx]) sRows[dayIdx] = { nm: 0, ua: 0, lti: 0 };
                sRows[dayIdx].nm += Number(log.numNearMiss) || 0;
                sRows[dayIdx].ua += Number(log.numUnsafeActs) || 0;
                sRows[dayIdx].lti += Number(log.numSafetyIncidents) || 0;
            }
        }
    });

    // H Rows
    const hRows = Array.from({length: 31}, () => ({ total: 0, absent: 0 }));
    // healthData array corresponds to [health1, health2, health3] roughly in order, but we can check the shift in the data
    const activeHealthRecord = healthData.find(h => String(h.shift) === activeCarouselShift);
    if (activeHealthRecord) {
        const days = activeHealthRecord?.days || [];
        days.forEach(day => {
            const dayIdx = Number(day.date) - 1;
            if (dayIdx >= 0 && dayIdx < 31) {
                hRows[dayIdx].total += Number(day.totalStrength) || 0;
                const total = Number(day.totalStrength) || 0;
                const attendees = day.attendees != null ? Number(day.attendees) : total;
                hRows[dayIdx].absent += (total - attendees);
            }
        });
    }

    const shiftDisplayName = activeCarouselShift === '1' ? 'Shift 1' : activeCarouselShift === '2' ? 'Shift 2' : 'Shift 3';

    // Helper functions for extracting issues and actions per pillar
    const getIssues = (letter) => {
        let issuesList = [];
        const m = metrics.find(metric => metric.letter === letter);
        if (m) {
            ['1', '2', '3'].forEach(shift => {
                (m.shifts?.[shift]?.staffLogs || []).forEach(log => {
                    // Filter logs based on selected month? 
                    // Usually issues board just shows the most recent ones overall, but we could filter by month.
                    // The time field in staffLog doesn't always have strict ISO dates, sometimes it's just "06:15 PM" depending on how user entered it. 
                    // We'll just show the latest chronologically across all time or rely on backend.
                    issuesList.push({ date: log.time || '', challenge: log.name || '', owner: log.action || '' });
                });
            });
        }
        issuesList.reverse();
        return issuesList;
    };

    const getActions = (letter) => {
        let actionsList = [];
        const m = metrics.find(metric => metric.letter === letter);
        if (m) {
            ['1', '2', '3'].forEach(shift => {
                (m.shifts?.[shift]?.activityLogs || []).forEach(log => {
                    actionsList.push({ date: log.time || '', action: log.name || '', owner: log.action || '', target: 'TBD', status: 'WIP' });
                });
            });
        }
        actionsList.reverse();
        return actionsList;
    };

    const qIssues = getIssues('Q');
    const dIssues = getIssues('D');
    const sIssues = getIssues('S');
    const hIssues = getIssues('H');

    const qActions = getActions('Q');
    const dActions = getActions('D');
    const sActions = getActions('S');
    const hActions = getActions('H');

    return (
        <div className="qdshi-board-container relative">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
                {['1', '2', '3'].map(s => (
                    <div 
                        key={s} 
                        onClick={() => setActiveCarouselShift(s)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${activeCarouselShift === s ? 'bg-emerald-600 text-white shadow-lg scale-110' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    >
                        Shift {s}
                    </div>
                ))}
            </div>

            <div className="absolute top-4 right-4 z-10 flex gap-3">
                <input 
                    type="month" 
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg px-3 py-1.5 shadow-sm outline-none"
                />
                <select 
                    value={dept} 
                    onChange={(e) => setDept(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg px-3 py-1.5 shadow-sm outline-none"
                >
                    {Object.entries(DEPT_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
            </div>

            <div className="qdshi-board-inner" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                <div className="board-screw-bl"></div>
                <div className="board-screw-br"></div>
                
                {/* Header Information */}
                <div className="flex flex-wrap board-header-info mb-4 items-center">
                    <div className="w-full md:w-3/12">
                        <div className="logo-placeholder">
                            <span className="logo-icon">∞</span>
                            <div className="logo-text">SOFTGEL<br/><small>HEALTHCARE PVT. LTD.</small></div>
                        </div>
                    </div>
                    <div className="w-full md:w-2/12 text-center">
                        <strong>Area</strong>
                        <span className="text-blue-600">{DEPT_MAP[dept]}</span>
                    </div>
                    <div className="w-full md:w-2/12 text-center">
                        <strong>Month / Year</strong>
                        <span className="text-emerald-600">{currentMonthLong.substring(0, 3).toUpperCase()} / {currentYear}</span>
                    </div>
                    <div className="w-full md:w-3/12 text-center">
                        <strong>Meeting Timing</strong>
                        <span className="text-blue-600">06:00-06:15 | 14:00-14:15</span>
                    </div>
                    <div className="w-full md:w-2/12 text-center">
                        <strong>Board Owner</strong>
                        <span className="text-emerald-600">Dept. Head</span>
                    </div>
                </div>

                {/* Grid Layout (4 columns for QDSH) */}
                <div className="qdshi-grid">
                    {/* Row 0: Grid Headers (Circles) */}
                    <div className="grid-cell empty-cell flex justify-end items-center"></div>
                    <div className="grid-cell"><DailyCircle letter="Q" selectedMonthIdx={currentMonthIdx} selectedYear={currentYear} /></div>
                    <div className="grid-cell"><DailyCircle letter="D" selectedMonthIdx={currentMonthIdx} selectedYear={currentYear} /></div>
                    <div className="grid-cell"><DailyCircle letter="S" selectedMonthIdx={currentMonthIdx} selectedYear={currentYear} /></div>
                    <div className="grid-cell"><DailyCircle letter="H" selectedMonthIdx={currentMonthIdx} selectedYear={currentYear} /></div>

                    {/* Row 1: Metrics / KPI */}
                    <div className="grid-cell row-label">Metrics / KPI</div>
                    <div className="grid-cell">
                        <div key={`q-${activeCarouselShift}`} className="carousel-fade h-full w-full">
                            <DailyTable 
                                title={`Major Metric: No. of repeat deviation (${shiftDisplayName})`} 
                                metricHeader="Human error related deviations"
                                subheaders={['Status']}
                                colorClass="th-q-bg"
                                rowsData={qRows}
                                formatCell={(row, idx) => row[idx]}
                                getCellClass={(row, idx) => {
                                    const val = row[idx];
                                    if (val === '✅') return 'bg-emerald-100 text-emerald-800';
                                    if (val === 'HE' || val === 'PE' || val === '⚠️') return 'bg-red-100 text-red-800';
                                    return '';
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid-cell">
                        <div key={`d-${activeCarouselShift}`} className="carousel-fade h-full w-full">
                            <DailyTable 
                                title={`Major Metric: Plan Vs Actual (${shiftDisplayName})`} 
                                metricHeader="Delivery Plan Vs Actual"
                                subheaders={['Plan', 'Actual', 'Var']}
                                colorClass="th-d-bg"
                                rowsData={dRows}
                                formatCell={(row, idx) => {
                                    if (row.plan === 0 && row.actual === 0) return '';
                                    if (idx === 0) return row.plan;
                                    if (idx === 1) return row.actual;
                                    const diff = row.actual - row.plan;
                                    return <span className={diff >= 0 ? 'text-emerald-600' : 'text-red-500'}>{diff > 0 ? `+${diff}` : diff}</span>;
                                }}
                                getCellClass={(row, idx) => {
                                    if (row.plan === 0 && row.actual === 0) return '';
                                    if (idx === 2) {
                                        const diff = row.actual - row.plan;
                                        return diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';
                                    }
                                    return '';
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid-cell">
                        <div key={`s-${activeCarouselShift}`} className="carousel-fade h-full w-full">
                            <DailyTable 
                                title={`Major Metric: No. of Safety Incidents (${shiftDisplayName})`} 
                                metricHeader="Near Miss / Unsafe Acts / LTI"
                                subheaders={['NM', 'UA', 'LTI']}
                                colorClass="th-s-bg"
                                rowsData={sRows}
                                formatCell={(row, idx) => {
                                    if (!row) return '';
                                    return idx === 0 ? row.nm : idx === 1 ? row.ua : <span className={row.lti > 0 ? 'text-red-500' : ''}>{row.lti}</span>;
                                }}
                                getCellClass={(row, idx) => {
                                    if (!row) return '';
                                    if (idx === 0 && row.nm > 0) return 'bg-amber-100 text-amber-800'; // near miss warning
                                    if (idx === 1 && row.ua > 0) return 'bg-orange-100 text-orange-800'; // unsafe act warning
                                    if (idx === 2 && row.lti > 0) return 'bg-red-100 text-red-800'; // LTI critical
                                    if (idx === 2 && row.lti === 0) return 'bg-emerald-100 text-emerald-800'; // Zero LTI is good
                                    return '';
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid-cell">
                        <div key={`h-${activeCarouselShift}`} className="carousel-fade h-full w-full">
                            <DailyTable 
                                title={`Major Metric: Absenteeism (${shiftDisplayName})`} 
                                metricHeader="Health / Absenteeism Rate"
                                subheaders={['Staff', 'Abs', '%']}
                                colorClass="th-h-bg"
                                rowsData={hRows}
                                formatCell={(row, idx) => {
                                    if (row.total === 0) return '';
                                    if (idx === 0) return row.total;
                                    if (idx === 1) return row.absent;
                                    return ((row.absent / row.total) * 100).toFixed(1) + '%';
                                }}
                                getCellClass={(row, idx) => {
                                    if (row.total === 0) return '';
                                    if (idx === 1 || idx === 2) {
                                        return row.absent > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800';
                                    }
                                    return '';
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Issues / Challenges */}
                    <div className="grid-cell row-label">Issues /<br/>Challenges</div>
                    <div className="grid-cell"><IssuesTable issues={qIssues} /></div>
                    <div className="grid-cell"><IssuesTable issues={dIssues} /></div>
                    <div className="grid-cell"><IssuesTable issues={sIssues} /></div>
                    <div className="grid-cell"><IssuesTable issues={hIssues} /></div>

                    {/* Row 3: Action Tracker */}
                    <div className="grid-cell row-label">Action Tracker</div>
                    <div className="grid-cell"><ActionTable actions={qActions} /></div>
                    <div className="grid-cell"><ActionTable actions={dActions} /></div>
                    <div className="grid-cell"><ActionTable actions={sActions} /></div>
                    <div className="grid-cell"><ActionTable actions={hActions} /></div>
                </div>
            </div>
        </div>
    );
}
