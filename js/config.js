// CONFIGURATIE & GLOBALE STATE
const API_URL = "https://script.google.com/macros/s/AKfycbxEzGC3ZSIYceQ4E01sBg_YEY14rv13h38DzavDU4NKO7N_l3zM2TpQcCw4nd2S_JQ/exec"; 
const ADMIN_SECRET = "1115";

let docentenCache = [];
let schoolsCache = [];
let currentDocent = null;
let currentPin = "";
let enteredPin = "";
let pinCallback = null;
let currentCalendarDate = new Date();
let availabilityCache = {}; 
let selectedDayForPicker = null;

let plannerViewMode = '3weeks';
let plannerCurrentDate = new Date();
let filterOnlyGaten = false;

let currentActiveOnTours = [];
let selectedTourForRegistration = null;
let activeOtChoice = null;
let selectedOtDays = {};

let currentSlotTarget = null;
let emergencyOverrideAllDocents = false;
let ghostPeriodesData = [];

let viewingAdminDocent = null;
let adminDocentCalDate = new Date();
let selectedAdminDayAction = null;
let docFilterTour = false;
let docFilterRijbewijs = false;
let docFilterAuto = false;

let clockClicks = 0;
let clockTimer = null;
let adminData = { 
  docenten: [], 
  availability: [], 
  planning: [], 
  onTours: [], 
  onTourInschrijvingen: [], 
  schools: [], 
  pendingPeriodRequests: [] 
};
