/**
 * Public roster transcribed from the supplied CSR member list.
 * The source names 115 division members; its community summary also counts
 * 13 additional core-team members without individual profiles.
 * Only public name, division, role, year and department fields are retained.
 * IDs below are local ordinal keys, not identifiers from the source document.
 */
export type Member = {
  readonly id: string
  readonly name: string
  readonly divisionId?: string
  readonly division?: string
  readonly year?: string
  readonly department?: string
  readonly role?: string
}

export type MemberDivision = {
  readonly id: string
  readonly name: string
  readonly shortName: string
  readonly lead?: string
}

export const memberDivisions: readonly MemberDivision[] = [
  {
    "id": "ai",
    "name": "AI & Intelligent Systems",
    "shortName": "AI",
    "lead": "Anto Jenishia A",
  },
  {
    "id": "embedded",
    "name": "Embedded & Electronics",
    "shortName": "Embedded",
    "lead": "Abhishek S",
  },
  {
    "id": "robotics",
    "name": "Robotics & Autonomous Systems",
    "shortName": "Robotics",
    "lead": "Guru prakash Muthusamy",
  },
  {
    "id": "software",
    "name": "Software Engineering",
    "shortName": "Software",
    "lead": "Sumetha V",
  },
  {
    "id": "iot",
    "name": "IoT & Smart Systems",
    "shortName": "IoT",
    "lead": "DILLI BABU S",
  },
  {
    "id": "research",
    "name": "Research & Publications",
    "shortName": "Research",
    "lead": "Rakesh K",
  },
  {
    "id": "operations",
    "name": "Operations & Management",
    "shortName": "Operations",
    "lead": "ASWIN R",
  }
]

export const members: readonly Member[] = [
  {
    "id": "member-001",
    "name": "Anto Jenishia A",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Division Lead"
  },
  {
    "id": "member-002",
    "name": "Amisha R K",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-003",
    "name": "DEEPAK KUMAR D",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-004",
    "name": "Devamalyaa G R",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-005",
    "name": "Dilish",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "III Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-006",
    "name": "HARINI SRI S",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-007",
    "name": "IMAM AFRITHEEN P",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-008",
    "name": "Kanimozhi T",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-009",
    "name": "MANISH KUMAAR R M",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-010",
    "name": "Manoj Kumar P",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Mechanical Engineering",
    "role": "Member"
  },
  {
    "id": "member-011",
    "name": "R D Sai Saran",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-012",
    "name": "sadhana",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-013",
    "name": "Sanjay Kumar M",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-014",
    "name": "Shruthilaya B",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Member"
  },
  {
    "id": "member-015",
    "name": "Subathra S",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "III Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-016",
    "name": "Surendirakumar S",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-017",
    "name": "Thejasvini G S",
    "divisionId": "ai",
    "division": "AI & Intelligent Systems",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-018",
    "name": "Abhishek S",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Division Lead"
  },
  {
    "id": "member-019",
    "name": "Athi Suriya",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-020",
    "name": "CHINMAYI B",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-021",
    "name": "Dharsan Kumar S",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-022",
    "name": "Dharshini R",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-023",
    "name": "Dinesh Karthick",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-024",
    "name": "Eknath Nuvvula",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-025",
    "name": "Jay Vigneswaran S A",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-026",
    "name": "Kapilan J",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-027",
    "name": "M.R.Harish",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-028",
    "name": "MOHAMED BASITH",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "III Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-029",
    "name": "R NITHISH KARTHI",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-030",
    "name": "S Sai Madura Bashini",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-031",
    "name": "Sam Gabriel Bilshan",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-032",
    "name": "SANGA ELAKIYA R",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "II Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-033",
    "name": "Subikeesh M",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "III Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-034",
    "name": "Tharun Raj P",
    "divisionId": "embedded",
    "division": "Embedded & Electronics",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-035",
    "name": "Guru prakash Muthusamy",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "III Year",
    "department": "Mechanical Engineering",
    "role": "Division Lead"
  },
  {
    "id": "member-036",
    "name": "ANNAMALAI N",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "III Year",
    "department": "Mechanical Engineering",
    "role": "Member"
  },
  {
    "id": "member-037",
    "name": "Bhavani Sankar M",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-038",
    "name": "Hemalesh S",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-039",
    "name": "Hemanth kiran R",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-040",
    "name": "Jai suriya",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "III Year",
    "department": "Mechanical Engineering",
    "role": "Member"
  },
  {
    "id": "member-041",
    "name": "Jevin J",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-042",
    "name": "Mahendar J",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-043",
    "name": "NITHYA SRE V",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Mechanical Engineering",
    "role": "Member"
  },
  {
    "id": "member-044",
    "name": "PRISCILLA SHIRLEY PRASHANTH STEPHENS",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Mechanical Engineering",
    "role": "Member"
  },
  {
    "id": "member-045",
    "name": "Roselin Ivana J",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-046",
    "name": "Rubashree Kannan",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-047",
    "name": "Sai karunya",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-048",
    "name": "Subash D",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-049",
    "name": "Tamizharasi M",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-050",
    "name": "Yoganandh J",
    "divisionId": "robotics",
    "division": "Robotics & Autonomous Systems",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-051",
    "name": "Sumetha V",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Division Lead"
  },
  {
    "id": "member-052",
    "name": "Bavan J",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "III Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-053",
    "name": "GNANESHWAR R",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-054",
    "name": "Krishanth",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-055",
    "name": "NHESIKA S G",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-056",
    "name": "Nivaedhitha",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "III Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-057",
    "name": "Ponperumal M",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "III Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-058",
    "name": "Renuga V",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-059",
    "name": "Shivanya Arunachalam",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-060",
    "name": "Suruthika R",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Member"
  },
  {
    "id": "member-061",
    "name": "Thirsha T A",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-062",
    "name": "VARSHINI G H",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-063",
    "name": "Varun K",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-064",
    "name": "VEERA AYYANAR P",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-065",
    "name": "VINOTH KUMAR M",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-066",
    "name": "Yashmitha .K",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-067",
    "name": "Yogadharshini S",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-068",
    "name": "Yuva Raj",
    "divisionId": "software",
    "division": "Software Engineering",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Member"
  },
  {
    "id": "member-069",
    "name": "DILLI BABU S",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Division Lead"
  },
  {
    "id": "member-070",
    "name": "AKSHAYAA POORNIMA G",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-071",
    "name": "ARUNRAJ M",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-072",
    "name": "Deepan Raju U",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-073",
    "name": "Eenusha S",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-074",
    "name": "G S Kowshik kumar",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "III Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-075",
    "name": "Janani",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-076",
    "name": "Madhu Mathy",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-077",
    "name": "Madhumitha JM",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "III Year",
    "department": "Mechanical Engineering",
    "role": "Member"
  },
  {
    "id": "member-078",
    "name": "Nandana M R",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-079",
    "name": "Sakthi M",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-080",
    "name": "Samyutha R",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-081",
    "name": "SHAARUNANDHANA SS",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-082",
    "name": "SHALIKA N",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "II Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-083",
    "name": "V K JANANI",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "III Year",
    "department": "Mechanical Engineering",
    "role": "Member"
  },
  {
    "id": "member-084",
    "name": "Vijay Karthik A",
    "divisionId": "iot",
    "division": "IoT & Smart Systems",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-085",
    "name": "Rakesh K",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Division Lead"
  },
  {
    "id": "member-086",
    "name": "Adharsh S",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-087",
    "name": "Ashni R",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Biotechnology",
    "role": "Member"
  },
  {
    "id": "member-088",
    "name": "Balamurugan V",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-089",
    "name": "D.Divyadarshini",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-090",
    "name": "ELAKHYA S G",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-091",
    "name": "gomathy s",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Biotechnology",
    "role": "Member"
  },
  {
    "id": "member-092",
    "name": "Jaivant R",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-093",
    "name": "Kavinila P",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-094",
    "name": "Keerthika G",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Member"
  },
  {
    "id": "member-095",
    "name": "Monish ganapathy A.V",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-096",
    "name": "N.S.Rathish Kalyan",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-097",
    "name": "Paul Bryton Raj",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-098",
    "name": "Shabeena S",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "III Year",
    "department": "Computer and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-099",
    "name": "SIVASANTHI R",
    "divisionId": "research",
    "division": "Research & Publications",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-100",
    "name": "ASWIN R",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "II Year",
    "department": "Computer Science and Business Systems",
    "role": "Division Lead"
  },
  {
    "id": "member-101",
    "name": "A G KARTHIK",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Member"
  },
  {
    "id": "member-102",
    "name": "Aishwarya M J",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Member"
  },
  {
    "id": "member-103",
    "name": "DHARUN A.R.",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-104",
    "name": "Janani Balasubraminan",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "III Year",
    "department": "Computer Science and Business Systems",
    "role": "Member"
  },
  {
    "id": "member-105",
    "name": "K MOHAMED FAAIZ",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  },
  {
    "id": "member-106",
    "name": "Lakshmi S",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-107",
    "name": "Lavanya G",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-108",
    "name": "MANIKANDAN V",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "II Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-109",
    "name": "Mohammed Aamir Uzair Khan",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-110",
    "name": "Mohammed Sharukkhan M",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "II Year",
    "department": "Computer Science and Engineering",
    "role": "Member"
  },
  {
    "id": "member-111",
    "name": "Padmavathy s",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "III Year",
    "department": "VLSI",
    "role": "Member"
  },
  {
    "id": "member-112",
    "name": "S.GIRIDHARAN",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "II Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-113",
    "name": "Sarath",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "III Year",
    "department": "Electronics and Communication Engineering",
    "role": "Member"
  },
  {
    "id": "member-114",
    "name": "Shivasubramanian A",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "III Year",
    "department": "Artificial Intelligence and Machine Learning",
    "role": "Member"
  },
  {
    "id": "member-115",
    "name": "V JAYAGANESH",
    "divisionId": "operations",
    "division": "Operations & Management",
    "year": "II Year",
    "department": "Artificial Intelligence and Data Science",
    "role": "Member"
  }
]

export const getMemberStats = (records: readonly Member[] = members) => {
  const uniqueMembers = new Map(records.map(member => [member.id, member])).values()
  const roster = [...uniqueMembers]
  const byDivision = Object.fromEntries(memberDivisions.map(division => [
    division.id,
    roster.filter(member => member.divisionId === division.id || member.division === division.name).length,
  ]))
  const byYear = Object.fromEntries([...new Set(roster.map(member => member.year).filter(Boolean))].map(year => [
    year!,
    roster.filter(member => member.year === year).length,
  ]))
  const listedProfiles = roster.filter(member => Boolean(member.name?.trim()))
  const divisionMembers = Object.values(byDivision).reduce((total, count) => total + count, 0)
  return { total: roster.length, listed: listedProfiles.length, divisionMembers, divisions: memberDivisions.length, byDivision, byYear }
}

export const memberStats = getMemberStats()

/** Initials remain abstract; no member photos are supplied in the roster. */
export function getMemberInitials(name: string): string {
  const parts = name.trim().split(/[\s.]+/u).filter(Boolean)
  if (!parts.length) return ''
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toLocaleUpperCase()
}

function searchText(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Match public names and metadata without changing roster order or records. */
export function searchMembers(records: readonly Member[], query: string): readonly Member[] {
  const tokens = searchText(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return records
  return records.filter(member => {
    const value = searchText([member.name, member.division, member.year, member.department, member.role].filter(Boolean).join(' '))
    return tokens.every(token => value.includes(token))
  })
}
