// Dati persona
var persona = {
    sesso: "uomo",
    eta: 18,
    altezzacm: 163,
    pesokg: 52
};

const KCAL_PER_MACRO = {
    CARB: 4,
    PROT: 4,
    LIP: 9
};

// Valori medi dei moltiplicatori di attività
const activityMultipliers = {
    uomo: { riposo: 1.45, pesi: 1.70, kickboxing: 1.90 },
    donna: { riposo: 1.40, pesi: 1.65, kickboxing: 1.85 }
};

// Distribuzione calorica per pasto (Somma = 1.0)
const mealCalorieDistribution = {
    riposo: { Colazione: 0.20, Spuntino: 0.10, Pranzo: 0.30, Cena: 0.30, Spuntino2: 0.10 },
    pesi: { Colazione: 0.25, Spuntino: 0.10, Pranzo: 0.35, Cena: 0.20, Spuntino2: 0.10 },
    kickboxing: { Colazione: 0.25, Spuntino: 0.10, Pranzo: 0.30, Cena: 0.25, Spuntino2: 0.10 }
};

// Percentuali Macronutrienti
const dietMacroProfiles = {
    maintain: {
        low: { prot: 0.325, fat: 0.325, carbs: 0.35 },
        high: { prot: 0.30, fat: 0.245, carbs: 0.455 },
        k1: { prot: 0.275, fat: 0.215, carbs: 0.51 },
    },
    deficitNormal: {
        low: { prot: 0.35, fat: 0.30, carbs: 0.35 },
        high: { prot: 0.31, fat: 0.225, carbs: 0.465 },
        k1: { prot: 0.285, fat: 0.185, carbs: 0.53 },
    },
    deficitFast: {
        low: { prot: 0.375, fat: 0.225, carbs: 0.35 },
        high: { prot: 0.35, fat: 0.20, carbs: 0.45 },
        k1: { prot: 0.325, fat: 0.175, carbs: 0.50 },
    },
};

var BMR;
var dietMode = "deficitFast";
var targetTDEE = {};

// Funzione per limite proteico dinamico basato su giorno e modalità
function getDynamicMaxProt(giorno, dietMode) {
    if (dietMode === "deficitFast") {
        if (giorno === "HIGH") return 2.4; 
        if (giorno === "K1") return 2.2;
        return 2.0;
    }
    if (dietMode === "deficitNormal") {
        if (giorno === "HIGH") return 2.2; 
        if (giorno === "K1") return 2.1;
        return 2.0;
    }
    if (giorno === "HIGH") return 2.1;
    if (giorno === "K1") return 2.0;
    return 1.9;
}

function calcolaBMR(){
    if (persona.sesso === "uomo") {
        BMR = 10 * persona.pesokg + 6.25 * persona.altezzacm - 5 * persona.eta + 5;
    } else {
        BMR = 10 * persona.pesokg + 6.25 * persona.altezzacm - 5 * persona.eta - 161;
    }
    BMR = Math.round(BMR);
    document.getElementById('bmr-output').textContent = BMR;
}

function calcolaTDEE(){
    if (!BMR) calcolaBMR();
    const multipliers = persona.sesso === "uomo" ? activityMultipliers.uomo : activityMultipliers.donna;

    let deficitFactor = 1.0;
    if (dietMode === "deficitNormal") deficitFactor = 0.875; 
    else if (dietMode === "deficitFast") deficitFactor = 0.75;

    targetTDEE.riposo = Math.round(BMR * multipliers.riposo * deficitFactor);
    targetTDEE.pesi = Math.round(BMR * multipliers.pesi * deficitFactor);
    targetTDEE.kickboxing = Math.round(BMR * multipliers.kickboxing * deficitFactor);
    
    document.getElementById('tdee-riposo-output').textContent = targetTDEE.riposo;
    document.getElementById('tdee-pesi-output').textContent = targetTDEE.pesi;
    document.getElementById('tdee-kickboxing-output').textContent = targetTDEE.kickboxing;   
}

function calcolaMacroPerPasto(giorno, nomePasto) {
    let activityKey = giorno === 'HIGH' ? 'pesi' : (giorno === 'K1' ? 'kickboxing' : 'riposo');
    const tdeeCal = targetTDEE[activityKey];
    const dayMacroProfile = dietMacroProfiles[dietMode][giorno.toLowerCase()];
    const mealCaloriePercent = mealCalorieDistribution[activityKey][nomePasto] || 0.10;

    const mealTotalTargetKcal = Math.round(tdeeCal * mealCaloriePercent); 
    
    const dynamicLimit = getDynamicMaxProt(giorno, dietMode);
    const maxProtDailyGrams = Math.round(persona.pesokg * dynamicLimit);
    const maxProtDailyKcal = maxProtDailyGrams * KCAL_PER_MACRO.PROT;
    
    const targetProtKcalCalculated = Math.round(tdeeCal * dayMacroProfile.prot);
    const actualProtDailyKcal = Math.min(targetProtKcalCalculated, maxProtDailyKcal);

    const remainingDailyKcal = tdeeCal - actualProtDailyKcal;
    const originalCarbLipPercent = dayMacroProfile.carbs + dayMacroProfile.fat;
    
    const actualCarbDailyKcal = Math.round(remainingDailyKcal * (dayMacroProfile.carbs / originalCarbLipPercent));
    const actualFatDailyKcal = Math.round(remainingDailyKcal * (dayMacroProfile.fat / originalCarbLipPercent));

    const protGrams = Math.round((actualProtDailyKcal * mealCaloriePercent) / KCAL_PER_MACRO.PROT);
    const carbGrams = Math.round((actualCarbDailyKcal * mealCaloriePercent) / KCAL_PER_MACRO.CARB);
    const fatGrams = Math.round((actualFatDailyKcal * mealCaloriePercent) / KCAL_PER_MACRO.LIP);

    return { carbGrams, protGrams, fatGrams, mealTotalTargetKcal }; 
}

function getFoodMacroValues(foodName) {
    const food = foodsData.find(f => f.name.toLowerCase().trim() === foodName.toLowerCase().trim());
    if (!food) return null;
    return {
        carbPerGram: food.carbs / food.grams,
        protPerGram: food.protein / food.grams,
        fatPerGram: food.fat / food.grams,
        unitFactor: food.unitFactor 
    };
}

function getMacroValueCells(data) {
    const value = data.valore !== null && data.valore !== undefined && data.valore !== 0 ? data.valore : '-';
    const carbValue = data.CARB ? `<span class="carb">${value}</span>` : '<span class="empty">-</span>';
    const protValue = data.PROT ? `<span class="prot">${value}</span>` : '<span class="empty">-</span>';
    const lipValue = data.LIP ? `<span class="lip">${value}</span>` : '<span class="empty">-</span>';
    return `<td>${carbValue}</td><td>${protValue}</td><td>${lipValue}</td>`;
}

function populateTableWithCalculations(data, tableId, nomePasto) {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    tableBody.innerHTML = ''; 

    const macroTargets = {
        HIGH: calcolaMacroPerPasto('HIGH', nomePasto),
        K1: calcolaMacroPerPasto('K1', nomePasto),
        LOW: calcolaMacroPerPasto('LOW', nomePasto)
    };

    data.forEach(item => {
        const row = tableBody.insertRow();
        const alimentoCell = row.insertCell();
        alimentoCell.textContent = item.alimento;
        alimentoCell.classList.add('alimento-col');
        
        const foodMacroValues = getFoodMacroValues(item.alimento);
        
        function calculateTargetValue(giorno, macroKey, isMacroFlag) {
            if (!foodMacroValues || !isMacroFlag) return '-';

            const macroPerGramKey = `${macroKey.toLowerCase()}PerGram`; 
            const targetGramsKey = `${macroKey.toLowerCase()}Grams`;
            const targetGrams = macroTargets[giorno][targetGramsKey];
            const mealTotalTargetKcal = macroTargets[giorno].mealTotalTargetKcal;
            const macroPerGram = foodMacroValues[macroPerGramKey];

            const foodTotalKcalPerGram = 
                foodMacroValues.carbPerGram * KCAL_PER_MACRO.CARB +
                foodMacroValues.protPerGram * KCAL_PER_MACRO.PROT +
                foodMacroValues.fatPerGram * KCAL_PER_MACRO.LIP;

            if (macroPerGram === 0) return '-'; 
            
            let totalFoodGramsNeeded = targetGrams / macroPerGram;

            // Cap calorico per singolo alimento
            if (foodTotalKcalPerGram > 0 && totalFoodGramsNeeded * foodTotalKcalPerGram > mealTotalTargetKcal) {
                totalFoodGramsNeeded = mealTotalTargetKcal / foodTotalKcalPerGram;
            }

            let finalValue;
            if (item.unità.toUpperCase() === 'GR' || item.unità.toUpperCase() === 'ML') {
                finalValue = Math.round(totalFoodGramsNeeded);
            } else {
                finalValue = Math.round(totalFoodGramsNeeded / foodMacroValues.unitFactor);
            }

            return finalValue > 0 ? finalValue : 1;
        }
        
        ['HIGH', 'K1', 'LOW'].forEach(g => {
            const cValue = calculateTargetValue(g, 'CARB', item[g].CARB);
            const pValue = calculateTargetValue(g, 'PROT', item[g].PROT);
            const lValue = calculateTargetValue(g, 'LIP', item[g].LIP);
            row.innerHTML += getMacroValueCells({
                valore: item[g].CARB ? cValue : (item[g].PROT ? pValue : lValue),
                CARB: item[g].CARB, PROT: item[g].PROT, LIP: item[g].LIP
            });
        });

        row.insertCell().textContent = item.unità;
    });
}

// --- DATI ALIMENTARI (foodsData) ---
const foodsData = [
    // CARBOHYDRATE Sources
    { name: "Frutti", carbs: 15, protein: 1, fat: 0.5, grams: 100, unitFactor: 150, unitType: "UNITÀ" }, // Frutto medio 150g
    { name: "Gallette", carbs: 80, protein: 8, fat: 1, grams: 100, unitFactor: 15, unitType: "UNITÀ" }, // Galletta media 10g
    { name: "WASA", carbs: 70, protein: 10, fat: 2, grams: 100, unitFactor: 10, unitType: "UNITÀ" }, // WASA media 10g
    { name: "Pane", carbs: 50, protein: 8, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cocomero", carbs: 7, protein: 0.5, fat: 0.1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Crackers", carbs: 75, protein: 8, fat: 10, grams: 100, unitFactor: 7, unitType: "UNITÀ" }, // Cracker medio 7g
    { name: "Focaccia", carbs: 55, protein: 7, fat: 12, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cioccolato fondente 99%", carbs: 10, protein: 15, fat: 60, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cioccolato al latte", carbs: 55, protein: 8, fat: 30, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Fruttosio", carbs: 99, protein: 0, fat: 0, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Zucchero", carbs: 99, protein: 0, fat: 0, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Miele", carbs: 82, protein: 0.3, fat: 0, grams: 100, unitFactor: 15, unitType: "CUCCHIAINI" }, // 1 cucchiaino = 15g
    { name: "Marmellata", carbs: 55, protein: 0.5, fat: 0.1, grams: 100, unitFactor: 15, unitType: "CUCCHIAINI" }, // 1 cucchiaino = 15g
    { name: "Frollini", carbs: 65, protein: 7, fat: 18, grams: 100, unitFactor: 12, unitType: "UNITÀ" }, // Frollino medio 12g
    { name: "Fette biscottate", carbs: 75, protein: 10, fat: 3, grams: 100, unitFactor: 8, unitType: "UNITÀ" }, // Fetta media 8g
    { name: "Riso soffiato/ Farro soffiato", carbs: 80, protein: 8, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Fiocchi d'avena", carbs: 60, protein: 12, fat: 7, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Avena decorticata (cotta)", carbs: 18, protein: 4, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Latte d’avena / Latte di riso", carbs: 10, protein: 0.5, fat: 1.5, grams: 100, unitFactor: 1, unitType: "ML" }, // Liquido, 1ml ≈ 1g
    { name: "FARINA (Generico)", carbs: 75, protein: 10, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "AVENA ISTANTANEA", carbs: 68, protein: 15, fat: 7, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Patate", carbs: 18, protein: 2, fat: 0.1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Zucca", carbs: 7, protein: 1, fat: 0.1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Legumi lessati", carbs: 15, protein: 8, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Melone", carbs: 8, protein: 0.8, fat: 0.1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Mais", carbs: 20, protein: 3, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Polenta (cotta)", carbs: 15, protein: 2, fat: 0.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Pasta", carbs: 73, protein: 13, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Riso", carbs: 77, protein: 12, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Farro", carbs: 65, protein: 15, fat: 2.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cous cous", carbs: 79, protein: 11, fat: 1.9, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Orzo mondo", carbs: 69, protein: 12, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Orzo perlato", carbs: 70, protein: 11, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Gnocchi di patate", carbs: 30, protein: 3, fat: 0.5, grams: 100, unitFactor: 1, unitType: "GR" },
    
    // PROTEIN Sources
    { name: "Whey", carbs: 5, protein: 75, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Salmone affumicato / Pesce spada affumicato", carbs: 0, protein: 25, fat: 10, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Tonno / Sgombro sgocciolato", carbs: 0, protein: 25, fat: 8, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Bresaola", carbs: 0, protein: 32, fat: 3, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Fesa di tacchino", carbs: 1, protein: 20, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Prosciutto crudo, speck (sgrassato)", carbs: 0, protein: 28, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Prosciutto cotto (sgrassato)", carbs: 0, protein: 20, fat: 3, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Albume", carbs: 1, protein: 10, fat: 0, grams: 100, unitFactor: 1, unitType: "ML" }, // 1ml ≈ 1g
    { name: "Uova di gallina intere", carbs: 0.5, protein: 13, fat: 10, grams: 100, unitFactor: 50, unitType: "UNITÀ" }, // Uovo medio 50g
    { name: "Latte scremato, Latte PS", carbs: 5, protein: 3.5, fat: 1.5, grams: 100, unitFactor: 1, unitType: "ML" }, // 1ml ≈ 1g
    { name: "Ricotta vaccina", carbs: 4, protein: 10, fat: 12, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "KEFIR", carbs: 4, protein: 3.5, fat: 3, grams: 100, unitFactor: 200, unitType: "BICCHIERI" }, // Bicchiere medio 200g
    { name: "Yogurt greco 0%", carbs: 4, protein: 10, fat: 0, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Formaggio spalmabile light, SKYR, ricotta di pecora", carbs: 4, protein: 15, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Parmigiano grana", carbs: 0, protein: 35, fat: 30, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Latte di soja", carbs: 3, protein: 3.5, fat: 2, grams: 100, unitFactor: 1, unitType: "ML" }, // 1ml ≈ 1g
    { name: "Fiocchi di latte light", carbs: 3, protein: 12, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Caprino, formaggino light", carbs: 1, protein: 15, fat: 10, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Feta, crescenza", carbs: 1, protein: 15, fat: 20, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Sottiletta", carbs: 5, protein: 18, fat: 15, grams: 100, unitFactor: 20, unitType: "GR" },
    { name: "Polpo", carbs: 0, protein: 14, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Gamberi, gamberetti", carbs: 0, protein: 20, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cozze (Parte edibile)", carbs: 3, protein: 12, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Vongole (Parte edibile)", carbs: 3, protein: 10, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Salmone (Fresco), sogliola, spigola", carbs: 0, protein: 18, fat: 12, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Pesce spada, cefalo muggine, palombo", carbs: 0, protein: 20, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Branzino, cernia, dentice, merluzzo, nasello, granchio", carbs: 0, protein: 16, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Tonno (Fresco), occhiata, orata, sarda, sardine, scorfano", carbs: 0, protein: 22, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Pollo, tacchino, faraona (Petto)", carbs: 0, protein: 25, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Vitello, manzo, agnello, coniglio, maiale (Tagli magri)", carbs: 0, protein: 20, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Simmenthal montana", carbs: 0, protein: 20, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Fior di latte, mozzarella light", carbs: 2, protein: 20, fat: 10, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Mozz. di bufala, caciottina fresca", carbs: 1, protein: 16, fat: 24, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Emmenthal, groviera", carbs: 0.1, protein: 28, fat: 30, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Germogli di soja", carbs: 3, protein: 10, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Quorn", carbs: 3, protein: 11, fat: 3, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Tofu", carbs: 2, protein: 8, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Tempeh", carbs: 10, protein: 19, fat: 11, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Seitan", carbs: 7, protein: 30, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Hamburger di soja", carbs: 5, protein: 15, fat: 5, grams: 100, unitFactor: 100, unitType: "UNITÀ" }, // Hamburger medio 100g
    { name: "Salsiccia di soja, hot dog di soja", carbs: 5, protein: 15, fat: 5, grams: 100, unitFactor: 50, unitType: "UNITÀ" }, // Salsiccia media 50g
    
    // LIPID Sources
    { name: "Pinoli", carbs: 10, protein: 14, fat: 70, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Pistacchi, arachidi", carbs: 15, protein: 20, fat: 50, grams: 100, unitFactor: 1, unitType: "GR" }, // 5g
    { name: "Anacardi, mandorle, nocciole", carbs: 20, protein: 20, fat: 55, grams: 100, unitFactor: 1, unitType: "GR" }, // 5g
    { name: "Noci, noci di macadamia, pecan", carbs: 15, protein: 15, fat: 65, grams: 100, unitFactor: 1, unitType: "GR" }, // 5g
    { name: "Burro di arachidi", carbs: 20, protein: 25, fat: 50, grams: 100, unitFactor: 20, unitType: "CUCCHIAI" }, // 1 cucchiaio ≈ 20g
    { name: "Burro", carbs: 0, protein: 0.5, fat: 82, grams: 100, unitFactor: 5, unitType: "CUCCHIAINI" }, // 1 cucchiaino ≈ 5g
    { name: "Olive nere, olive verdi", carbs: 4, protein: 1, fat: 15, grams: 100, unitFactor: 10, unitType: "UNITÀ" }, // 10g (circa 5-10 olive)
    { name: "Latte di cocco", carbs: 6, protein: 2, fat: 20, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Maionese light", carbs: 5, protein: 1, fat: 30, grams: 100, unitFactor: 10, unitType: "CUCCHIAINI" }, // 1 cucchiaino ≈ 10g
    { name: "Avocado", carbs: 8, protein: 2, fat: 15, grams: 100, unitFactor: 20, unitType: "CUCCHIAI" }, // 1 cucchiaio polpa ≈ 20g
    { name: "Olio EVO", carbs: 0, protein: 0, fat: 100, grams: 100, unitFactor: 10, unitType: "CUCCHIAI" }, // 1 cucchiaio ≈ 10g
];
