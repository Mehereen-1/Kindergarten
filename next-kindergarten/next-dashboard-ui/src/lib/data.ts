// TEMPORARY DATA

export let role = "admin";

export const teachersData = [
  {
    id: 1,
    teacherId: "0171234567",
    name: "sadia mostafa",
    email: "sadia.mostafa@gmacom",
    photo:
      "https://images.pexels.com/photos/2888150/pexels-photo-2888150.jpeg?auto=compress&cs=tinysrgb&w=1200",
    phone: "+88017123456",
    subjects: ["Math", "Geometry"],
    classes: ["1B", "2A", "3C"],
    address: "Dhaka, Bangladesh",
  },
  {
    id: 2,
    teacherId: "0181234568",
    name: "Ayesha Mehereen",
    email: "ayesha.mehereen@gmacom",
    photo:
      "https://images.pexels.com/photos/936126/pexels-photo-936126.jpeg?auto=compress&cs=tinysrgb&w=1200",
    phone: "+88018123456",
    subjects: ["Physics", "Chemistry"],
    classes: ["5A", "4B", "3C"],
    address: "Chittagong, Bangladesh",
  },
  {
    id: 3,
    teacherId: "0191234569",
    name: "Rashed Hassan",
    email: "rashed.hassan@gmacom",
    photo:
      "https://images.pexels.com/photos/428328/pexels-photo-428328.jpeg?auto=compress&cs=tinysrgb&w=1200",
    phone: "+88019123456",
    subjects: ["Biology", "English"],
    classes: ["5A", "4B"],
    address: "Sylhet, Bangladesh",
  },
  {
    id: 4,
    teacherId: "0181234570",
    name: "adiba Islam",
    email: "adiba.islam@gmacom",
    photo:
      "https://images.pexels.com/photos/1102341/pexels-photo-1102341.jpeg?auto=compress&cs=tinysrgb&w=1200",
    phone: "+88018123457",
    subjects: ["History", "Social Studies"],
    classes: ["6A", "3C"],
    address: "Rajshahi, Bangladesh",
  },
];

export const studentsData = [
  {
    id: 1,
    studentId: "0171111111",
    name: "ayesha",
    email: "arif.rahman@gmail.com",
    photo:
      "https://images.pexels.com/photos/2888150/pexels-photo-2888150.jpeg?auto=compress&cs=tinysrgb&w=1200",
    phone: "+88017111111",
    grade: 5,
    class: "1B",
    address: "Dhaka, Bangladesh",
  },
  {
    id: 2,
    studentId: "0181111112",
    name: "Mahhia Zainab",
    email: "mahhia.zainab@gmacom",
    photo:
      "https://images.pexels.com/photos/936126/pexels-photo-936126.jpeg?auto=compress&cs=tinysrgb&w=1200",
    phone: "+88018111112",
    grade: 5,
    class: "5A",
    address: "Chittagong, Bangladesh",
  },
  {
    id: 3,
    studentId: "0191111113",
    name: "Hasan Ali",
    email: "hasan.ali@yahoo.com",
    photo:
      "https://images.pexels.com/photos/428328/pexels-photo-428328.jpeg?auto=compress&cs=tinysrgb&w=1200",
    phone: "+88019111113",
    grade: 5,
    class: "5A",
    address: "Sylhet, Bangladesh",
  },
  {
    id: 4,
    studentId: "0181111114",
    name: "Shamima Akter",
    email: "shamima.akter@hotmail.com",
    photo:
      "https://images.pexels.com/photos/1102341/pexels-photo-1102341.jpeg?auto=compress&cs=tinysrgb&w=1200",
    phone: "+88018111114",
    grade: 5,
    class: "3C",
    address: "Rajshahi, Bangladesh",
  },
];

export const parentsData = [
  {
    id: 1,
    name: "Mohammad Ali",
    students: ["Arif Rahman"],
    email: "mohammad.ali@gmail.com",
    phone: "+88017222222",
    address: "Dhaka, Bangladesh",
  },
  {
    id: 2,
    name: "Fatema Begum",
    students: ["Zainab Mirza"],
    email: "fatema.begum@gmail.com",
    phone: "+88018222222",
    address: "Chittagong, Bangladesh",
  },
  {
    id: 3,
    name: "Ibrahim Hassan",
    students: ["Hasan Ali", "Shamima Akter"],
    email: "ibrahim.hassan@yahoo.com",
    phone: "+88019222222",
    address: "Sylhet, Bangladesh",
  },
];

export const subjectsData = [
  {
    id: 1,
    name: "Math",
    teachers: ["Karim Ahmed", "Rashed Hassan"],
  },
  {
    id: 2,
    name: "English",
    teachers: ["Fatima Khan", "Nadia Islam"],
  },
  {
    id: 3,
    name: "Physics",
    teachers: ["Karim Ahmed"],
  },
  {
    id: 4,
    name: "Biology",
    teachers: ["Rashed Hassan", "Fatima Khan"],
  },
];

export const classesData = [
  {
    id: 1,
    name: "1A",
    capacity: 25,
    grade: 1,
    supervisor: "Karim Ahmed",
  },
  {
    id: 2,
    name: "2B",
    capacity: 25,
    grade: 2,
    supervisor: "Fatima Khan",
  },
  {
    id: 3,
    name: "3C",
    capacity: 25,
    grade: 3,
    supervisor: "Rashed Hassan",
  },
  {
    id: 4,
    name: "5A",
    capacity: 25,
    grade: 5,
    supervisor: "Nadia Islam",
  },
];

export const lessonsData = [
  {
    id: 1,
    subject: "Math",
    class: "1A",
    teacher: "Karim Ahmed",
  },
  {
    id: 2,
    subject: "English",
    class: "2A",
    teacher: "Fatima Khan",
  },
  {
    id: 3,
    subject: "Science",
    class: "3A",
    teacher: "Rashed Hassan",
  },
  {
    id: 4,
    subject: "Social Studies",
    class: "1B",
    teacher: "Nadia Islam",
  },
];

export const examsData = [
  {
    id: 1,
    subject: "Math",
    class: "1A",
    teacher: "Karim Ahmed",
    date: "2025-02-15",
  },
  {
    id: 2,
    subject: "English",
    class: "2A",
    teacher: "Fatima Khan",
    date: "2025-02-16",
  },
  {
    id: 3,
    subject: "Science",
    class: "3A",
    teacher: "Rashed Hassan",
    date: "2025-02-17",
  },
  {
    id: 4,
    subject: "Social Studies",
    class: "5A",
    teacher: "Nadia Islam",
    date: "2025-02-18",
  },
];

export const assignmentsData = [
  {
    id: 1,
    subject: "Math",
    class: "1A",
    teacher: "Karim Ahmed",
    dueDate: "2025-02-20",
  },
  {
    id: 2,
    subject: "English",
    class: "2A",
    teacher: "Fatima Khan",
    dueDate: "2025-02-21",
  },
  {
    id: 3,
    subject: "Science",
    class: "3A",
    teacher: "Rashed Hassan",
    dueDate: "2025-02-22",
  },
  {
    id: 4,
    subject: "Social Studies",
    class: "5A",
    teacher: "Nadia Islam",
    dueDate: "2025-02-23",
  },
];

export const resultsData = [
  {
    id: 1,
    subject: "Math",
    class: "1A",
    teacher: "Karim Ahmed",
    student: "Arif Rahman",
    date: "2025-02-25",
    type: "exam",
    score: 92,
  },
  {
    id: 2,
    subject: "English",
    class: "2A",
    teacher: "Fatima Khan",
    student: "Zainab Mirza",
    date: "2025-02-25",
    type: "exam",
    score: 88,
  },
  {
    id: 3,
    subject: "Science",
    class: "3A",
    teacher: "Rashed Hassan",
    student: "Hasan Ali",
    date: "2025-02-25",
    type: "exam",
    score: 85,
  },
];

export const eventsData = [
  {
    id: 1,
    title: "Class Picnic",
    class: "1A",
    date: "2025-03-10",
    startTime: "10:00",
    endTime: "12:00",
  },
  {
    id: 2,
    title: "Sports Day",
    class: "2A",
    date: "2025-03-15",
    startTime: "09:00",
    endTime: "14:00",
  },
  {
    id: 3,
    title: "Science Fair",
    class: "3A",
    date: "2025-03-20",
    startTime: "10:00",
    endTime: "13:00",
  },
  {
    id: 4,
    title: "Music Program",
    class: "5A",
    date: "2025-03-25",
    startTime: "15:00",
    endTime: "17:00",
  },
];

export const announcementsData = [
  {
    id: 1,
    title: "Class 1A Math Exam on March 15",
    class: "1A",
    date: "2025-03-05",
  },
  {
    id: 2,
    title: "Class 2B English Project Submission Deadline",
    class: "2B",
    date: "2025-03-08",
  },
  {
    id: 3,
    title: "Class 3C Science Field Trip - March 20",
    class: "3C",
    date: "2025-03-10",
  },
  {
    id: 4,
    title: "Annual Sports Day - March 25",
    class: "5A",
    date: "2025-03-12",
  },
];


// YOU SHOULD CHANGE THE DATES OF THE EVENTS TO THE CURRENT DATE TO SEE THE EVENTS ON THE CALENDAR
export const calendarEvents = [
  {
    title: "Math",
    allDay: false,
    start: new Date(2024, 7, 12, 8, 0),
    end: new Date(2024, 7, 12, 8, 45),
  },
  {
    title: "English",
    allDay: false,
    start: new Date(2024, 7, 12, 9, 0),
    end: new Date(2024, 7, 12, 9, 45),
  },
  {
    title: "Biology",
    allDay: false,
    start: new Date(2024, 7, 12, 10, 0),
    end: new Date(2024, 7, 12, 10, 45),
  },
  {
    title: "Physics",
    allDay: false,
    start: new Date(2024, 7, 12, 11, 0),
    end: new Date(2024, 7, 12, 11, 45),
  },
  {
    title: "Chemistry",
    allDay: false,
    start: new Date(2024, 7, 12, 13, 0),
    end: new Date(2024, 7, 12, 13, 45),
  },
  {
    title: "History",
    allDay: false,
    start: new Date(2024, 7, 12, 14, 0),
    end: new Date(2024, 7, 12, 14, 45),
  },
  {
    title: "English",
    allDay: false,
    start: new Date(2024, 7, 13, 9, 0),
    end: new Date(2024, 7, 13, 9, 45),
  },
  {
    title: "Biology",
    allDay: false,
    start: new Date(2024, 7, 13, 10, 0),
    end: new Date(2024, 7, 13, 10, 45),
  },
  {
    title: "Physics",
    allDay: false,
    start: new Date(2024, 7, 13, 11, 0),
    end: new Date(2024, 7, 13, 11, 45),
  },

  {
    title: "History",
    allDay: false,
    start: new Date(2024, 7, 13, 14, 0),
    end: new Date(2024, 7, 13, 14, 45),
  },
  {
    title: "Math",
    allDay: false,
    start: new Date(2024, 7, 14, 8, 0),
    end: new Date(2024, 7, 14, 8, 45),
  },
  {
    title: "Biology",
    allDay: false,
    start: new Date(2024, 7, 14, 10, 0),
    end: new Date(2024, 7, 14, 10, 45),
  },

  {
    title: "Chemistry",
    allDay: false,
    start: new Date(2024, 7, 14, 13, 0),
    end: new Date(2024, 7, 14, 13, 45),
  },
  {
    title: "History",
    allDay: false,
    start: new Date(2024, 7, 14, 14, 0),
    end: new Date(2024, 7, 13, 14, 45),
  },
  {
    title: "English",
    allDay: false,
    start: new Date(2024, 7, 15, 9, 0),
    end: new Date(2024, 7, 15, 9, 45),
  },
  {
    title: "Biology",
    allDay: false,
    start: new Date(2024, 7, 15, 10, 0),
    end: new Date(2024, 7, 15, 10, 45),
  },
  {
    title: "Physics",
    allDay: false,
    start: new Date(2024, 7, 15, 11, 0),
    end: new Date(2024, 7, 15, 11, 45),
  },

  {
    title: "History",
    allDay: false,
    start: new Date(2024, 7, 15, 14, 0),
    end: new Date(2024, 7, 15, 14, 45),
  },
  {
    title: "Math",
    allDay: false,
    start: new Date(2024, 7, 16, 8, 0),
    end: new Date(2024, 7, 16, 8, 45),
  },
  {
    title: "English",
    allDay: false,
    start: new Date(2024, 7, 16, 9, 0),
    end: new Date(2024, 7, 16, 9, 45),
  },

  {
    title: "Physics",
    allDay: false,
    start: new Date(2024, 7, 16, 11, 0),
    end: new Date(2024, 7, 16, 11, 45),
  },
  {
    title: "Chemistry",
    allDay: false,
    start: new Date(2024, 7, 16, 13, 0),
    end: new Date(2024, 7, 16, 13, 45),
  },
  {
    title: "History",
    allDay: false,
    start: new Date(2024, 7, 16, 14, 0),
    end: new Date(2024, 7, 16, 14, 45),
  },
];