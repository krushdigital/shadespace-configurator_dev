@@ .. @@
const INITIAL_STATE: ConfiguratorState = {
  step: 0,
  fabricType: 'monotec370' as FabricType,
  fabricColor: 'Koonunga Green',
  edgeType: '' as EdgeType,
  corners: 0,
  unit: '' as 'metric' | 'imperial',
  measurementOption: '' as 'adjust' | 'exact',
  points: [
    { x: 100, y: 150 },
    { x: 500, y: 150 },
    { x: 500, y: 450 },
    { x: 100, y: 450 }
  ],
  measurements: {},
  fixingHeights: [],
  fixingTypes: undefined,
  eyeOrientations: undefined,
  currency: 'USD' // Default currency, will be updated by IP detection
};

@@ .. @@
import { validateMeasurements, validateHeights, getDiagonalKeysForCorners } from '../utils/geometry';
import { generatePDF } from '../utils/pdfGenerator';
import { EXCHANGE_RATES } from '../data/pricing'; // Import EXCHANGE_RATES to check supported currencies

@@ .. @@
  }, []);

  // IP-based currency detection effect
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.currency) {
          const detectedCurrency = data.currency;
          // Check if the detected currency is supported by your pricing data
          if (EXCHANGE_RATES[detectedCurrency]) {
            updateConfig({ currency: detectedCurrency });
            console.log(`Detected currency: ${detectedCurrency}`);
          } else {
            console.warn(`Detected currency ${detectedCurrency} is not supported. Defaulting to USD.`);
            updateConfig({ currency: 'USD' }); // Fallback to USD
          }
        } else {
          console.error('Failed to detect currency from ipapi.co: No currency field in response.');
          updateConfig({ currency: 'USD' }); // Fallback to USD
        }
      } catch (error) {
        console.error('Error during IP-based currency detection:', error);
        updateConfig({ currency: 'USD' }); // Fallback to USD on network error
      }
    };

    detectCurrency();
  }, []); // Empty dependency array ensures this runs only once on mount

  const updateConfig = (updates: Partial<ConfiguratorState>) => {