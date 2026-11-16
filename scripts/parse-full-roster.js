import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawData = [
  // AI & Intelligent Systems (17)
  { sNo: 1, name: "Anto Jenishia A", role: "Division Lead", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "A", email: "antojenishia@gmail.com", phone: "9385304636", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 2, name: "Amisha R K", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "A", email: "amisha.250022@aids.ritchennai.edu.in", phone: "7845063810", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 3, name: "DEEPAK KUMAR D", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "A", email: "deepakkumar.250059@aids.ritchennai.edu.in", phone: "9514040528", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 4, name: "Devamalyaa G R", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "A", email: "grdevamalyaa@gmail.com", phone: "6383839171", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 5, name: "Dilish", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "A", email: "rdilish3434@gmail.com", phone: "9042286919", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 6, name: "HARINI SRI S", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "B", email: "harinisri.250106@aids.ritchennai.edu.in", phone: "7845755166", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 7, name: "IMAM AFRITHEEN P", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "C", email: "imamafritheen.250147@cse.ritchennai.edu.in", phone: "7825995590", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 8, name: "Kanimozhi T", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "B", email: "kanimozhi.240061@aiml.ritchennai.edu.in", phone: "8870046894", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 9, name: "MANISH KUMAAR R M", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "E", email: "rmmanishkumaar777@gmail.com", phone: "9176333411", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 10, name: "Manoj Kumar P", role: "Member", year: "II Year", department: "Mechanical Engineering", sec: "A", email: "manojkumarx7777@gmail.com", phone: "6383380037", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 11, name: "R D Sai Saran", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "C", email: "saisaran.240125@aiml.ritchennai.edu.in", phone: "8838182183", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 12, name: "sadhana", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "G", email: "sadhana.250363@cse.ritchennai.edu.in", phone: "8807537549", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 13, name: "Sanjay Kumar M", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "F", email: "sanjaykumar.250307@aids.ritchennai.edu.in", phone: "6383910035", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 14, name: "Shruthilaya B", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "C", email: "shruthilayab3@gmail.com", phone: "8122341678", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 15, name: "Subathra S", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "B", email: "subathra.240087@cce.ritchennai.edu.in", phone: "9043520907", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 16, name: "Surendirakumar S", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "E", email: "surendirakumar.250274@ece.ritchennai.edu.in", phone: "7540096376", divisionId: "ai", division: "AI & Intelligent Systems" },
  { sNo: 17, name: "Thejasvini G S", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "C", email: "thejasvini1223@gmail.com", phone: "9123528125", divisionId: "ai", division: "AI & Intelligent Systems" },

  // Embedded & Electronics (17)
  { sNo: 18, name: "Abhishek S", role: "Division Lead", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "abhishek.250005@ece.ritchennai.edu.in", phone: "7550260838", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 19, name: "Athi Suriya", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "athisuriya.250030@ece.ritchennai.edu.in", phone: "8838736687", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 20, name: "CHINMAYI B", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "A", email: "chinmayi.250015@cce.ritchennai.edu.in", phone: "8248398465", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 21, name: "Dharsan Kumar S", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "dharsankumar.250053@ece.ritchennai.edu.in", phone: "9566363232", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 22, name: "Dharshini R", role: "Member", year: "II Year", department: "VLSI", sec: "A", email: "rdharshini082@gmail.com", phone: "6379227663", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 23, name: "Dinesh Karthick", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "dineshkarthick.250056@ece.ritchennai.edu.in", phone: "9940971308", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 24, name: "Eknath Nuvvula", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "eknathnuvvula.250059@ece.ritchennai.edu.in", phone: "8667338512", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 25, name: "Jay Vigneswaran S A", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "A", email: "jayvigneswaran.240052@ece.ritchennai.edu.in", phone: "9442155259", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 26, name: "Kapilan J", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "B", email: "kapilan.250119@ece.ritchennai.edu.in", phone: "7200895610", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 27, name: "M.R.Harish", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "B", email: "harish.250081@ece.ritchennai.edu.in", phone: "9385357460", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 28, name: "MOHAMED BASITH", role: "Member", year: "III Year", department: "VLSI", sec: "B", email: "mohamedbasith.240075@vlsi.ritchennai.edu.in", phone: "8056010856", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 29, name: "R NITHISH KARTHI", role: "Member", year: "II Year", department: "VLSI", sec: "B", email: "nithishkarthi.250075@vlsi.ritchennai.edu.in", phone: "7358777613", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 30, name: "S Sai Madura Bashini", role: "Member", year: "II Year", department: "VLSI", sec: "B", email: "saimadurabashini.250095@vlsi.ritchennai.edu.in", phone: "8838250274", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 31, name: "Sam Gabriel Bilshan", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", email: "samgabrielbilshan@gmail.com", phone: "7358361065", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 32, name: "SANGA ELAKIYA R", role: "Member", year: "II Year", department: "VLSI", sec: "B", email: "sangaelakiya.250100@vlsi.ritchennai.edu.in", phone: "9150041054", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 33, name: "Subikeesh M", role: "Member", year: "III Year", department: "VLSI", sec: "C", email: "subikeesh431@gmail.com", phone: "9344639934", divisionId: "embedded", division: "Embedded & Electronics" },
  { sNo: 34, name: "Tharun Raj P", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", email: "tharunraj.240168@ece.ritchennai.edu.in", phone: "7358119524", divisionId: "embedded", division: "Embedded & Electronics" },

  // Robotics & Autonomous Systems (16)
  { sNo: 35, name: "Guru prakash Muthusamy", role: "Division Lead", year: "III Year", department: "Mechanical Engineering", sec: "A", email: "guruprakash.240026@mech.ritchennai.edu.in", phone: "9360543075", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 36, name: "ANNAMALAI N", role: "Member", year: "III Year", department: "Mechanical Engineering", sec: "A", email: "annamalai.240006@mech.ritchennai.edu.in", phone: "8939145999", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 37, name: "Bhavani Sankar M", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "A", email: "bhavanisankar.240015@ece.ritchennai.edu.in", phone: "9790896599", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 38, name: "Hemalesh S", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "C", email: "hemalesh.250141@cse.ritchennai.edu.in", phone: "7448815336", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 39, name: "Hemanth kiran R", role: "Member", year: "II Year", department: "VLSI", sec: "A", email: "hemanthkiran.250038@vlsi.ritchennai.edu.in", phone: "8438019569", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 40, name: "Jai suriya", role: "Member", year: "III Year", department: "Mechanical Engineering", sec: "A", email: "jaisuriya.240030@mech.ritchennai.edu.in", phone: "9786300130", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 41, name: "Jevin J", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "D", email: "jevin.250176@cse.ritchennai.edu.in", phone: "9003428146", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 42, name: "Mahendar J", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "C", email: "mahendar.250144@ece.ritchennai.edu.in", phone: "8807617268", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 43, name: "NITHYA SRE V", role: "Member", year: "II Year", department: "Mechanical Engineering", sec: "B", email: "nithyasre.250070@mech.ritchennai.edu.in", phone: "8248743438", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 44, name: "PRISCILLA SHIRLEY PRASHANTH STEPHENS", role: "Member", year: "II Year", department: "Mechanical Engineering", sec: "B", email: "priscillashirleyprashanthstephens.250080@mech.ritchennai.edu.in", phone: "9790248776", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 45, name: "Roselin Ivana J", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "D", email: "roselinivana.250216@ece.ritchennai.edu.in", phone: "8870364398", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 46, name: "Rubashree Kannan", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "D", email: "rubashree1215@gmail.com", phone: "9791771210", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 47, name: "Sai karunya", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "D", email: "saikarunya0503@gmail.com", phone: "8870449338", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 48, name: "Subash D", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "C", email: "subash.240147@aiml.ritchennai.edu.in", phone: "8668198847", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 49, name: "Tamizharasi M", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "H", email: "tamizharasi.250468@cse.ritchennai.edu.in", phone: "7200082671", divisionId: "robotics", division: "Robotics & Autonomous Systems" },
  { sNo: 50, name: "Yoganandh J", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", email: "yoganandh.240179@ece.ritchennai.edu.in", phone: "9445630998", divisionId: "robotics", division: "Robotics & Autonomous Systems" },

  // Software Engineering (18)
  { sNo: 51, name: "Sumetha V", role: "Division Lead", year: "III Year", department: "Computer Science and Business Systems", sec: "C", email: "sumethavenkatesan@gmail.com", phone: "6379576565", divisionId: "software", division: "Software Engineering" },
  { sNo: 52, name: "Bavan J", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "A", email: "bavan.240016@cce.ritchennai.edu.in", phone: "7092461182", divisionId: "software", division: "Software Engineering" },
  { sNo: 53, name: "GNANESHWAR R", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "B", email: "gnanoognanoo@gmail.com", phone: "9940832824", divisionId: "software", division: "Software Engineering" },
  { sNo: 54, name: "Krishanth", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "D", email: "krishanth.250218@cse.ritchennai.edu.in", phone: "8825992544", divisionId: "software", division: "Software Engineering" },
  { sNo: 55, name: "NHESIKA S G", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "D", email: "nhesika.250219@aids.ritchennai.edu.in", phone: "9790991826", divisionId: "software", division: "Software Engineering" },
  { sNo: 56, name: "Nivaedhitha", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "B", email: "nivaedhitha.240058@cce.ritchennai.edu.in", phone: "6385036061", divisionId: "software", division: "Software Engineering" },
  { sNo: 57, name: "Ponperumal M", role: "Member", year: "III Year", department: "Computer Science and Engineering", sec: "", email: "", phone: "9025954637", divisionId: "software", division: "Software Engineering" },
  { sNo: 58, name: "Renuga V", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "F", email: "renuga.250346@cse.ritchennai.edu.in", phone: "8148443038", divisionId: "software", division: "Software Engineering" },
  { sNo: 59, name: "Shivanya Arunachalam", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "H", email: "shivanya.250411@cse.ritchennai.edu.in", phone: "7845839150", divisionId: "software", division: "Software Engineering" },
  { sNo: 60, name: "Suruthika R", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "C", email: "ssuruthika475@gmail.com", phone: "8825962180", divisionId: "software", division: "Software Engineering" },
  { sNo: 61, name: "Thirsha T A", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "G", email: "thirsha.250373@aids.ritchennai.edu.in", phone: "9751878348", divisionId: "software", division: "Software Engineering" },
  { sNo: 62, name: "VARSHINI G H", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "I", email: "varshini161506@gmail.com", phone: "8056161506", divisionId: "software", division: "Software Engineering" },
  { sNo: 63, name: "Varun K", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "I", email: "varunkrishnakumar18@gmail.com", phone: "9791158504", divisionId: "software", division: "Software Engineering" },
  { sNo: 64, name: "VEERA AYYANAR P", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "B", email: "veeraayyanar010@gmail.com", phone: "8438192044", divisionId: "software", division: "Software Engineering" },
  { sNo: 65, name: "VINOTH KUMAR M", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "G", email: "vinothkumar.250392@aids.ritchennai.edu.in", phone: "9342517427", divisionId: "software", division: "Software Engineering" },
  { sNo: 66, name: "Yashmitha .K", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "I", email: "yashmitha.250521@cse.ritchennai.edu.in", phone: "9498476149", divisionId: "software", division: "Software Engineering" },
  { sNo: 67, name: "Yogadharshini S", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "I", email: "yogadharshini.250524@cse.ritchennai.edu.in", phone: "7845062328", divisionId: "software", division: "Software Engineering" },
  { sNo: 68, name: "Yuva Raj", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "C", email: "yuva00raj@gmail.com", phone: "9443875763", divisionId: "software", division: "Software Engineering" },

  // IoT & Smart Systems (16)
  { sNo: 69, name: "DILLI BABU S", role: "Division Lead", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "dillibabu.250055@ece.ritchennai.edu.in", phone: "9884961331", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 70, name: "AKSHAYAA POORNIMA G", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "akshayaapoornima.250015@ece.ritchennai.edu.in", phone: "7010686483", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 71, name: "ARUNRAJ M", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "arunraj.250027@ece.ritchennai.edu.in", phone: "7339105519", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 72, name: "Deepan Raju U", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "deepanraju.250047@ece.ritchennai.edu.in", phone: "6381020969", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 73, name: "Eenusha S", role: "Member", year: "II Year", department: "VLSI", sec: "A", email: "eenusha.250020@vlsi.ritchennai.edu.in", phone: "8668006224", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 74, name: "G S Kowshik kumar", role: "Member", year: "III Year", department: "VLSI", sec: "B", email: "kowshikgandhi07@gmail.com", phone: "7639779479", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 75, name: "Janani", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "A", email: "janani.240051@ece.ritchennai.edu.in", phone: "9600968316", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 76, name: "Madhu Mathy", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "C", email: "madhumathy.250141@ece.ritchennai.edu.in", phone: "7904680551", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 77, name: "Madhumitha JM", role: "Member", year: "III Year", department: "Mechanical Engineering", sec: "A", email: "madhumitha.240041@mech.ritchennai.edu.in", phone: "6382174086", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 78, name: "Nandana M R", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "C", email: "nandana.250172@ece.ritchennai.edu.in", phone: "9489972834", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 79, name: "Sakthi M", role: "Member", year: "II Year", department: "VLSI", sec: "B", email: "sakthi.250097@vlsi.ritchennai.edu.in", phone: "8807083956", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 80, name: "Samyutha R", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "B", email: "samyutha.250078@cce.ritchennai.edu.in", phone: "9003093672", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 81, name: "SHAARUNANDHANA SS", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "D", email: "shaarunandhana.250240@ece.ritchennai.edu.in", phone: "9345305866", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 82, name: "SHALIKA N", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "B", email: "shalika.250083@cce.ritchennai.edu.in", phone: "7010286980", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 83, name: "V K JANANI", role: "Member", year: "III Year", department: "Mechanical Engineering", sec: "A", email: "janani.240031@mech.ritchennai.edu.in", phone: "6369050554", divisionId: "iot", division: "IoT & Smart Systems" },
  { sNo: 84, name: "Vijay Karthik A", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", email: "vijay.240175@ece.ritchennai.edu.in", phone: "8825784369", divisionId: "iot", division: "IoT & Smart Systems" },

  // Research & Publications (15)
  { sNo: 85, name: "Rakesh K", role: "Division Lead", year: "III Year", department: "Computer Science and Business Systems", sec: "B", email: "rakesh.240109@csbs.ritchennai.edu.in", phone: "9840334375", divisionId: "research", division: "Research & Publications" },
  { sNo: 86, name: "Adharsh S", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "A", email: "adharsh.250008@aids.ritchennai.edu.in", phone: "9342778199", divisionId: "research", division: "Research & Publications" },
  { sNo: 87, name: "Ashni R", role: "Member", year: "II Year", department: "Biotechnology", sec: "A", email: "ashni.250004@bt.ritchennai.edu.in", phone: "9865142551", divisionId: "research", division: "Research & Publications" },
  { sNo: 88, name: "Balamurugan V", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "balamurugan.250033@ece.ritchennai.edu.in", phone: "7305144179", divisionId: "research", division: "Research & Publications" },
  { sNo: 89, name: "D.Divyadarshini", role: "Member", year: "II Year", department: "VLSI", sec: "A", email: "divyadarshini.250018@vlsi.ritchennai.edu.in", phone: "6379521212", divisionId: "research", division: "Research & Publications" },
  { sNo: 90, name: "ELAKHYA S G", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "B", email: "elakhya.250080@aids.ritchennai.edu.in", phone: "7845921517", divisionId: "research", division: "Research & Publications" },
  { sNo: 91, name: "gomathy s", role: "Member", year: "II Year", department: "Biotechnology", sec: "A", email: "sgomathy886@gmail.com", phone: "6369588001", divisionId: "research", division: "Research & Publications" },
  { sNo: 92, name: "Jaivant R", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "B", email: "jaivant.250098@ece.ritchennai.edu.in", phone: "7092516475", divisionId: "research", division: "Research & Publications" },
  { sNo: 93, name: "Kavinila P", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "B", email: "kavinilap2006@gmail.com", phone: "9025300876", divisionId: "research", division: "Research & Publications" },
  { sNo: 94, name: "Keerthika G", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "B", email: "keerthika.240062@csbs.ritchennai.edu.in", phone: "9445263528", divisionId: "research", division: "Research & Publications" },
  { sNo: 95, name: "Monish ganapathy A.V", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "D", email: "monishganapathy.250201@aids.ritchennai.edu.in", phone: "7358681218", divisionId: "research", division: "Research & Publications" },
  { sNo: 96, name: "N.S.Rathish Kalyan", role: "Member", year: "II Year", department: "Computer and Communication Engineering", sec: "B", email: "rathishkalyan.250071@cce.ritchennai.edu.in", phone: "6379013836", divisionId: "research", division: "Research & Publications" },
  { sNo: 97, name: "Paul Bryton Raj", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "F", email: "paulbrytonraj18@gmail.com", phone: "7358293518", divisionId: "research", division: "Research & Publications" },
  { sNo: 98, name: "Shabeena S", role: "Member", year: "III Year", department: "Computer and Communication Engineering", sec: "B", email: "shabeena.240079@cce.ritchennai.edu.in", phone: "8124878809", divisionId: "research", division: "Research & Publications" },
  { sNo: 99, name: "SIVASANTHI R", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "H", email: "sivasanthi.250425@cse.ritchennai.edu.in", phone: "7339176588", divisionId: "research", division: "Research & Publications" },

  // Operations & Management (16)
  { sNo: 100, name: "ASWIN R", role: "Division Lead", year: "II Year", department: "Computer Science and Business Systems", sec: "A", email: "aswin.250011@csbs.ritchennai.edu.in", phone: "7550040017", divisionId: "operations", division: "Operations & Management" },
  { sNo: 101, name: "A G KARTHIK", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "A", email: "karthik.240055@csbs.ritchennai.edu.in", phone: "9566073342", divisionId: "operations", division: "Operations & Management" },
  { sNo: 102, name: "Aishwarya M J", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "A", email: "aishwaryamj.240009@csbs.ritchennai.edu.in", phone: "9360056488", divisionId: "operations", division: "Operations & Management" },
  { sNo: 103, name: "DHARUN A.R.", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "A", email: "dharun.250054@ece.ritchennai.edu.in", phone: "7708300556", divisionId: "operations", division: "Operations & Management" },
  { sNo: 104, name: "Janani Balasubraminan", role: "Member", year: "III Year", department: "Computer Science and Business Systems", sec: "A", email: "jananibalasubraminan@gmail.com", phone: "8807707304", divisionId: "operations", division: "Operations & Management" },
  { sNo: 105, name: "K MOHAMED FAAIZ", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "D", email: "mohamedfaaiz.250189@aids.ritchennai.edu.in", phone: "9342422808", divisionId: "operations", division: "Operations & Management" },
  { sNo: 106, name: "Lakshmi S", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "B", email: "lakshmi.240070@ece.ritchennai.edu.in", phone: "9600968316", divisionId: "operations", division: "Operations & Management" },
  { sNo: 107, name: "Lavanya G", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "B", email: "suthalavanya2005@gmail.com", phone: "8754091381", divisionId: "operations", division: "Operations & Management" },
  { sNo: 108, name: "MANIKANDAN V", role: "Member", year: "II Year", department: "Electronics and Communication Engineering", sec: "C", email: "manikandan.250146@ece.ritchennai.edu.in", phone: "9655402387", divisionId: "operations", division: "Operations & Management" },
  { sNo: 109, name: "Mohammed Aamir Uzair Khan", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "E", email: "mohammedaamir.250248@cse.rit.chennai.edu.in", phone: "8056074920", divisionId: "operations", division: "Operations & Management" },
  { sNo: 110, name: "Mohammed Sharukkhan M", role: "Member", year: "II Year", department: "Computer Science and Engineering", sec: "E", email: "mohammedsharukkhan.250251@cse.ritchennai.edu.in", phone: "7339050987", divisionId: "operations", division: "Operations & Management" },
  { sNo: 111, name: "Padmavathy s", role: "Member", year: "III Year", department: "VLSI", sec: "B", email: "padmavathysrinivasan097@gmail.com", phone: "6383897886", divisionId: "operations", division: "Operations & Management" },
  { sNo: 112, name: "S.GIRIDHARAN", role: "Member", year: "II Year", department: "Artificial Intelligence and Machine Learning", sec: "A", email: "giridharan.250034@aiml.ritchennai.edu.in", phone: "9629902555", divisionId: "operations", division: "Operations & Management" },
  { sNo: 113, name: "Sarath", role: "Member", year: "III Year", department: "Electronics and Communication Engineering", sec: "C", email: "sarathramesh.mailbox@gmail.com", phone: "9944563016", divisionId: "operations", division: "Operations & Management" },
  { sNo: 114, name: "Shivasubramanian A", role: "Member", year: "III Year", department: "Artificial Intelligence and Machine Learning", sec: "C", email: "shivasubramanian.240142@aiml.ritchennai.edu.in", phone: "9025754509", divisionId: "operations", division: "Operations & Management" },
  { sNo: 115, name: "V JAYAGANESH", role: "Member", year: "II Year", department: "Artificial Intelligence and Data Science", sec: "C", email: "jayaganesh.250128@aids.ritchennai.edu.in", phone: "8939765597", divisionId: "operations", division: "Operations & Management" }
];

function escapeSql(str) {
  if (str === undefined || str === null || str === '') return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
-- CSR-RIT SUPABASE INITIAL SEED DATA
-- 115 Verified Members with Official Emails, Phones, Sections & Roles from Official PDF
-- Run this in your Supabase SQL Editor after running schema.sql
-- ==============================================================================

INSERT INTO csr_members (id, name, division_id, division, year, department, sec, role, email, phone)
VALUES
`;

const rows = rawData.map(m => {
  const id = `member-${String(m.sNo).padStart(3, '0')}`;
  return `  (${escapeSql(id)}, ${escapeSql(m.name)}, ${escapeSql(m.divisionId)}, ${escapeSql(m.division)}, ${escapeSql(m.year)}, ${escapeSql(m.department)}, ${escapeSql(m.sec)}, ${escapeSql(m.role)}, ${escapeSql(m.email)}, ${escapeSql(m.phone)})`;
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
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  updated_at = NOW();
`;

const outputPath = path.resolve(__dirname, '../supabase/seed.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');
console.log(`Generated rich seed SQL for ${rawData.length} members with contact info at ${outputPath}`);
