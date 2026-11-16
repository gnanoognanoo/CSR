import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawData = [
  // AI & Intelligent Systems (17)
  { sNo: 1, name: "Anto Jenishia A", role: "Division Lead", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "A", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 2, name: "Amisha R K", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "A", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 3, name: "DEEPAK KUMAR D", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "A", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 4, name: "Devamalyaa G R", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "A", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 5, name: "Dilish", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "A", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 6, name: "HARINI SRI S", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "B", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 7, name: "IMAM AFRITHEEN P", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "C", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 8, name: "Kanimozhi T", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "B", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 9, name: "MANISH KUMAAR R M", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "E", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 10, name: "Manoj Kumar P", role: "Member", year: "II Year", department: "Mechanical Engineering", sec: "A", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 11, name: "R D Sai Saran", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "C", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 12, name: "sadhana", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "G", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 13, name: "Sanjay Kumar M", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "F", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 14, name: "Shruthilaya B", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "C", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 15, name: "Subathra S", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "B", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 16, name: "Surendirakumar S", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "E", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 17, name: "Thejasvini G S", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "C", divisionId: "ai", division: "AI & Intelligent Systems" },

  // Embedded & Electronics (17)
  { sNo: 18, name: "Abhishek S", role: "Division Lead", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 19, name: "Athi Suriya", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 20, name: "CHINMAYI B", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "A", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 21, name: "Dharsan Kumar S", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 22, name: "Dharshini R", role: "Member", year: "II Year", department: "VLSI", sec: "A", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 23, name: "Dinesh Karthick", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 24, name: "Eknath Nuvvula", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 25, name: "Jay Vigneswaran S A", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 26, name: "Kapilan J", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "B", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 27, name: "M.R.Harish", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "B", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 28, name: "MOHAMED BASITH", role: "Member", year: "III Year", department: "VLSI", sec: "B", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 29, name: "R NITHISH KARTHI", role: "Member", year: "II Year", department: "VLSI", sec: "B", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 30, name: "S Sai Madura Bashini", role: "Member", year: "II Year", department: "VLSI", sec: "B", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 31, name: "Sam Gabriel Bilshan", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 32, name: "SANGA ELAKIYA R", role: "Member", year: "II Year", department: "VLSI", sec: "B", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 33, name: "Subikeesh M", role: "Member", year: "III Year", department: "VLSI", sec: "C", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 34, name: "Tharun Raj P", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "embedded", division: "Embedded & Electronics" },

  // Robotics & Autonomous Systems (16)
  { sNo: 35, name: "Guru prakash Muthusamy", role: "Division Lead", year: "III Year", department: "Mechanical Engineering", sec: "A", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 36, name: "ANNAMALAI N", role: "Member", year: "III Year", department: "Mechanical Engineering", sec: "A", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 37, name: "Bhavani Sankar M", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 38, name: "Hemalesh S", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "C", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 39, name: "Hemanth kiran R", role: "Member", year: "II Year", department: "VLSI", sec: "A", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 40, name: "Jai suriya", role: "Member", year: "III Year", department: "Mechanical Engineering", sec: "A", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 41, name: "Jevin J", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "D", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 42, name: "Mahendar J", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 43, name: "NITHYA SRE V", role: "Member", year: "II Year", department: "Mechanical Engineering", sec: "B", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 44, name: "PRISCILLA SHIRLEY PRASHANTH STEPHENS", role: "Member", year: "II Year", department: "Mechanical Engineering", sec: "B", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 45, name: "Roselin Ivana J", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "D", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 46, name: "Rubashree Kannan", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "D", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 47, name: "Sai karunya", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "D", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 48, name: "Subash D", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "C", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 49, name: "Tamizharasi M", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "H", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 50, name: "Yoganandh J", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "robotics", division: "Robotics & Autonomous Systems" },

  // Software Engineering (18)
  { sNo: 51, name: "Sumetha V", role: "Division Lead", year: "III Year", department: "Computer Science and Business Systems", sec: "C", divisionId: "software", division: "Software Engineering" },
  { sNo: 52, name: "Bavan J", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "A", divisionId: "software", division: "Software Engineering" },
  { sNo: 53, name: "GNANESHWAR R", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "B", divisionId: "software", division: "Software Engineering" },
  { sNo: 54, name: "Krishanth", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "D", divisionId: "software", division: "Software Engineering" },
  { sNo: 55, name: "NHESIKA S G", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "D", divisionId: "software", division: "Software Engineering" },
  { sNo: 56, name: "Nivaedhitha", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "B", divisionId: "software", division: "Software Engineering" },
  { sNo: 57, name: "Ponperumal M", role: "Member", year: "III Year", department: "Computer Science and Engineering", sec: "", divisionId: "software", division: "Software Engineering" },
  { sNo: 58, name: "Renuga V", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "F", divisionId: "software", division: "Software Engineering" },
  { sNo: 59, name: "Shivanya Arunachalam", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "H", divisionId: "software", division: "Software Engineering" },
  { sNo: 60, name: "Suruthika R", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "C", divisionId: "software", division: "Software Engineering" },
  { sNo: 61, name: "Thirsha T A", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "G", divisionId: "software", division: "Software Engineering" },
  { sNo: 62, name: "VARSHINI G H", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "I", divisionId: "software", division: "Software Engineering" },
  { sNo: 63, name: "Varun K", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "I", divisionId: "software", division: "Software Engineering" },
  { sNo: 64, name: "VEERA AYYANAR P", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "B", divisionId: "software", division: "Software Engineering" },
  { sNo: 65, name: "VINOTH KUMAR M", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "G", divisionId: "software", division: "Software Engineering" },
  { sNo: 66, name: "Yashmitha .K", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "I", divisionId: "software", division: "Software Engineering" },
  { sNo: 67, name: "Yogadharshini S", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "I", divisionId: "software", division: "Software Engineering" },
  { sNo: 68, name: "Yuva Raj", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "C", divisionId: "software", division: "Software Engineering" },

  // IoT & Smart Systems (16)
  { sNo: 69, name: "DILLI BABU S", role: "Division Lead", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 70, name: "AKSHAYAA POORNIMA G", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 71, name: "ARUNRAJ M", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 72, name: "Deepan Raju U", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 73, name: "Eenusha S", role: "Member", year: "II Year", department: "VLSI", sec: "A", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 74, name: "G S Kowshik kumar", role: "Member", year: "III Year", department: "VLSI", sec: "B", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 75, name: "Janani", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 76, name: "Madhu Mathy", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 77, name: "Madhumitha JM", role: "Member", year: "III Year", department: "Mechanical Engineering", sec: "A", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 78, name: "Nandana M R", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 79, name: "Sakthi M", role: "Member", year: "II Year", department: "VLSI", sec: "B", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 80, name: "Samyutha R", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "B", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 81, name: "SHAARUNANDHANA SS", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "D", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 82, name: "SHALIKA N", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "B", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 83, name: "V K JANANI", role: "Member", year: "III Year", department: "Mechanical Engineering", sec: "A", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 84, name: "Vijay Karthik A", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "iot", division: "IoT & Smart Systems" },

  // Research & Publications (15)
  { sNo: 85, name: "Rakesh K", role: "Division Lead", year: "III Year", department: "Computer Science and Business Systems", sec: "B", divisionId: "research", division: "Research & Publications" },
  { sNo: 86, name: "Adharsh S", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "A", divisionId: "research", division: "Research & Publications" },
  { sNo: 87, name: "Ashni R", role: "Member", year: "II Year", department: "Biotechnology", sec: "A", divisionId: "research", division: "Research & Publications" },
  { sNo: 88, name: "Balamurugan V", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "research", division: "Research & Publications" },
  { sNo: 89, name: "D.Divyadarshini", role: "Member", year: "II Year", department: "VLSI", sec: "A", divisionId: "research", division: "Research & Publications" },
  { sNo: 90, name: "ELAKHYA S G", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "B", divisionId: "research", division: "Research & Publications" },
  { sNo: 91, name: "gomathy s", role: "Member", year: "II Year", department: "Biotechnology", sec: "A", divisionId: "research", division: "Research & Publications" },
  { sNo: 92, name: "Jaivant R", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "B", divisionId: "research", division: "Research & Publications" },
  { sNo: 93, name: "Kavinila P", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "B", divisionId: "research", division: "Research & Publications" },
  { sNo: 94, name: "Keerthika G", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "B", divisionId: "research", division: "Research & Publications" },
  { sNo: 95, name: "Monish ganapathy A.V", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "D", divisionId: "research", division: "Research & Publications" },
  { sNo: 96, name: "N.S.Rathish Kalyan", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "B", divisionId: "research", division: "Research & Publications" },
  { sNo: 97, name: "Paul Bryton Raj", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "F", divisionId: "research", division: "Research & Publications" },
  { sNo: 98, name: "Shabeena S", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "B", divisionId: "research", division: "Research & Publications" },
  { sNo: 99, name: "SIVASANTHI R", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "H", divisionId: "research", division: "Research & Publications" },

  // Operations & Management (16)
  { sNo: 100, name: "ASWIN R", role: "Division Lead", year: "II Year", department: "Computer Science and Business Systems", sec: "A", divisionId: "operations", division: "Operations & Management" },
  { sNo: 101, name: "A G KARTHIK", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "A", divisionId: "operations", division: "Operations & Management" },
  { sNo: 102, name: "Aishwarya M J", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "A", divisionId: "operations", division: "Operations & Management" },
  { sNo: 103, name: "DHARUN A.R.", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", divisionId: "operations", division: "Operations & Management" },
  { sNo: 104, name: "Janani Balasubraminan", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "A", divisionId: "operations", division: "Operations & Management" },
  { sNo: 105, name: "K MOHAMED FAAIZ", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "D", divisionId: "operations", division: "Operations & Management" },
  { sNo: 106, name: "Lakshmi S", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "B", divisionId: "operations", division: "Operations & Management" },
  { sNo: 107, name: "Lavanya G", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "B", divisionId: "operations", division: "Operations & Management" },
  { sNo: 108, name: "MANIKANDAN V", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "operations", division: "Operations & Management" },
  { sNo: 109, name: "Mohammed Aamir Uzair Khan", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "E", divisionId: "operations", division: "Operations & Management" },
  { sNo: 110, name: "Mohammed Sharukkhan M", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "E", divisionId: "operations", division: "Operations & Management" },
  { sNo: 111, name: "Padmavathy s", role: "Member", year: "III Year", department: "VLSI", sec: "B", divisionId: "operations", division: "Operations & Management" },
  { sNo: 112, name: "S.GIRIDHARAN", role: "Member", year: "II Year", department: "Artificial Intelligence and Machine Learning", sec: "A", divisionId: "operations", division: "Operations & Management" },
  { sNo: 113, name: "Sarath", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", divisionId: "operations", division: "Operations & Management" },
  { sNo: 114, name: "Shivasubramanian A", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "C", divisionId: "operations", division: "Operations & Management" },
  { sNo: 115, name: "V JAYAGANESH", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "C", divisionId: "operations", division: "Operations & Management" }
];

function escapeSql(str) {
  if (str === undefined || str === null || str === '') return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
-- CSR-RIT SUPABASE INITIAL SEED DATA
-- 115 Verified Members with Public Roster Metadata (Sanitized - No PII)
-- Run this in your Supabase SQL Editor after running schema.sql
-- ==============================================================================

INSERT INTO csr_members (id, name, division_id, division, year, department, sec, role)
VALUES
`;

const rows = rawData.map(m => {
  const id = `member-${String(m.sNo).padStart(3, '0')}`;
  return `  (${escapeSql(id)}, ${escapeSql(m.name)}, ${escapeSql(m.divisionId)}, ${escapeSql(m.division)}, ${escapeSql(m.year)}, ${escapeSql(m.department)}, ${escapeSql(m.sec)}, ${escapeSql(m.role)})`;
});

sql += rows.join(',\n') + '\n';
sql += `ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  division_id = EXCLUDED.division_id,
  division = EXCLUDED.division,
  year = EXCLUDED.year,
  department = EXCLUDED.department,
  sec = EXCLUDED.sec,
  role = EXCLUDED.role,
  updated_at = NOW();
`;

const outputPath = path.resolve(__dirname, '../supabase/seed.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');
console.log(`Generated rich seed SQL for ${rawData.length} members with public fields (no PII) at ${outputPath}`);
