import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  CheckCircle2,
  Copy,
  X,
  XCircle,
  ShieldCheck,
  Loader2,
  Plus,
  Trash2,
  Bike,
  Store,
  ShoppingBag,
  Flame,
  Sun,
  Moon,
  Star,
  Info
} from 'lucide-react';

import type {
  BillingCycle,
  DeliveryZone,
  DishItem,
  ManagementPlan,
  MenuFormData,
  StepDefinition
} from '../types/wizard';
import ImageUpload from './ImageUpload';
import DishImageUpload from './DishImageUpload';
import StepWelcome from './steps/StepWelcome';
import FloatingWhatsAppSupport, { WhatsAppIcon } from './FloatingWhatsAppSupport';
import MercadoPagoIcon from './icons/MercadoPagoIcon';
import { parseColorToCss } from '../utils/colorParser';

import { db, FIRESTORE_COLLECTION } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const STORAGE_DATA_KEY = 'onboardingGastronomico_data';
const STORAGE_STEP_KEY = 'onboardingGastronomico_step';
const STORAGE_SUBSTEP_KEY = 'onboardingGastronomico_catalog_substep';
const STORAGE_CATEGORY_INDEX_KEY = 'onboardingGastronomico_category_index';

const CLOUDINARY_BASE_FOLDER = import.meta.env.VITE_CLOUDINARY_BASE_FOLDER || 'Menu inteligente';
const AGENCY_WHATSAPP = import.meta.env.VITE_AGENCY_WHATSAPP || '5491178188323';
const PAYMENT_ALIAS = 'ALAN.UX';
const ANNUAL_DISCOUNT_ARS = 39990;

const VIP_CYCLES: Record<BillingCycle, { label: string; usd: number; suffix: string }> = {
  mensual: { label: 'Mensual', usd: 10, suffix: '/ mes' },
  trimestral: { label: 'Trimestral', usd: 25, suffix: 'total trimestral' },
  semestral: { label: 'Semestral', usd: 45, suffix: 'total semestral' },
  anual: { label: 'Anual', usd: 100, suffix: '/ año' }
};

function calculateVipPricing(cycle: BillingCycle, dolarRate: number) {
  const info = VIP_CYCLES[cycle] ?? VIP_CYCLES.anual;
  const grossARS = info.usd * dolarRate;
  const discountARS = cycle === 'anual' ? ANNUAL_DISCOUNT_ARS : 0;
  const finalARS = Math.max(0, grossARS - discountARS);
  return {
    ...info,
    dolarRate,
    grossARS,
    discountARS,
    finalARS,
    grossFormatted: grossARS.toLocaleString('es-AR'),
    discountFormatted: discountARS.toLocaleString('es-AR'),
    finalFormatted: finalARS.toLocaleString('es-AR')
  };
}

type VipPricingSummary = ReturnType<typeof calculateVipPricing>;

// Resumen visual unificado para mostrar el cálculo en ARS y el descuento anual tachado
const VipTotalSummaryBanner = ({
  pricing,
  dolarFecha,
  eyebrowPrefix,
  totalLabel
}: {
  pricing: VipPricingSummary;
  dolarFecha?: string;
  eyebrowPrefix: string;
  totalLabel: string;
}) => (
  <div className="rounded-2xl sm:rounded-3xl bg-slate-950 text-white p-4 sm:p-5 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300">
        {eyebrowPrefix} · Mantenimiento VIP {pricing.label} ({pricing.usd} USD)
      </span>
      <span className="text-xs text-slate-300">
        Calculado al tipo de cambio oficial de hoy (1 USD = ${pricing.dolarRate.toLocaleString('es-AR')} ARS
        {dolarFecha ? ` · ${dolarFecha}` : ''})
      </span>
    </div>

    <div className="flex flex-col sm:items-end gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
      {pricing.discountARS > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 line-through decoration-rose-400/80 font-semibold">
            ${pricing.grossFormatted} ARS
          </span>
          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-400/20">
            Descuento -${pricing.discountFormatted} ARS
          </span>
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold text-slate-400">{totalLabel}</span>
        <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
          ${pricing.finalFormatted} ARS
        </span>
      </div>
    </div>
  </div>
);

// Componente de apoyo visible con personalidad de agencia
const AgencyCopyTip = ({ message }: { message: string }) => (
  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl px-4 py-3 flex items-start gap-3 text-xs sm:text-[13px] text-slate-700 leading-relaxed shadow-2xs">
    <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
    <div>
      <span className="font-bold text-slate-900 mr-1.5">Tip de nuestro equipo:</span>
      <span className="text-slate-700">{message}</span>
    </div>
  </div>
);

const initialData: MenuFormData = {
  // PASO 1
  mercadoLibreUser: '',

  // PASO 2
  restaurantName: '',

  // PASO 3
  logoUrl: '',
  noLogo: false,

  // PASO 4
  primaryColor: '#DC2626',
  themeTone: 'dark',

  // PASO 5: Modelo de Negocio y Suscripción
  managementPlan: 'vip',
  billingCycle: 'anual',

  // PASO 6: Creador de Catálogo
  categoriesList: [],
  dishesList: [],
  featuredDishIds: [],

  // PASO 7: Logística y Envíos
  whatsappNumber: '+54 9 ',
  deliveryMethods: {
    delivery: true,
    takeaway: true
  },
  deliveryZones: [],

  // PASO 8: Medios de Cobro (Checkout)
  paymentCbuAlias: '',
  paymentAccountHolder: '',
  paymentBank: '',
  acceptsCash: true,

  // PASO 9: Revisión y Puesta en Marcha
  acceptedTerms: false
};

const STEPS: StepDefinition[] = [
  { id: 'WELCOME', stepNumber: 0, title: 'Bienvenida', shortTitle: 'Inicio', category: 'Bienvenida' },
  { id: 'PURCHASE_VALIDATION', stepNumber: 1, title: 'Validación de Compra', shortTitle: 'Validación', category: 'Identidad' },
  { id: 'RESTAURANT_IDENTITY', stepNumber: 2, title: 'Identidad del Local', shortTitle: 'Nombre', category: 'Identidad' },
  { id: 'LOGO_UPLOAD', stepNumber: 3, title: 'Carga de Logotipo', shortTitle: 'Logotipo', category: 'Identidad' },
  { id: 'VISUAL_STYLE', stepNumber: 4, title: 'Estilo Visual', shortTitle: 'Estilo', category: 'Diseño' },
  { id: 'MANAGEMENT_PLAN', stepNumber: 5, title: 'Modelo de Negocio & Suscripción', shortTitle: 'Plan', category: 'Gestión' },
  { id: 'CATALOG_SETUP', stepNumber: 6, title: 'Estructura de tu Menú y Precios', shortTitle: 'Catálogo', category: 'Menú' },
  { id: 'LOGISTICS_WHATSAPP', stepNumber: 7, title: 'Recepción de Pedidos y Envíos', shortTitle: 'Logística', category: 'Operativa' },
  { id: 'PAYMENT_METHODS', stepNumber: 8, title: 'Medios de Cobro (Checkout)', shortTitle: 'Cobros', category: 'Finanzas' },
  { id: 'CLOSING_TERMS', stepNumber: 9, title: 'Revisión y Puesta en Marcha', shortTitle: 'Cierre', category: 'Finalizar' }
];

export default function Wizard() {
  // PERSISTENCIA EN LOCALSTORAGE (CRÍTICO)
  const [data, setData] = useState<MenuFormData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DATA_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        // Sanear datos mock de versiones previas para que no aparezcan platos demo prellenados
        const cleanDishes = Array.isArray(parsed.dishesList)
          ? parsed.dishesList.filter((d: DishItem) => !d.id?.startsWith('dish-sample-'))
          : [];

        const hadOnlySampleDishes =
          !parsed.dishesList ||
          parsed.dishesList.length === 0 ||
          parsed.dishesList.every((d: DishItem) => d.id?.startsWith('dish-sample-'));

        const cleanCategories = hadOnlySampleDishes
          ? []
          : Array.isArray(parsed.categoriesList)
          ? parsed.categoriesList
          : [];

        const cleanFeatured = Array.isArray(parsed.featuredDishIds)
          ? parsed.featuredDishIds.filter((id: string) => !id.startsWith('dish-sample-'))
          : [];

        const cleanZones = Array.isArray(parsed.deliveryZones)
          ? parsed.deliveryZones.filter(
              (z: DeliveryZone) =>
                !z.id?.startsWith('zone-1') &&
                !z.id?.startsWith('zone-2') &&
                z.name !== 'Palermo / Ramos Mejía Centro' &&
                z.name !== 'San Isidro / Zonas Aledañas'
            )
          : [];

        return {
          ...initialData,
          ...parsed,
          categoriesList: cleanCategories,
          dishesList: cleanDishes,
          featuredDishIds: cleanFeatured,
          deliveryZones: cleanZones
        };
      }
    } catch (e) {
      console.error('Error recuperando datos de localStorage:', e);
    }
    return initialData;
  });

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    try {
      const savedStep = localStorage.getItem(STORAGE_STEP_KEY);
      const savedData = localStorage.getItem(STORAGE_DATA_KEY);
      const parsedData = savedData ? JSON.parse(savedData) : null;
      // Si no hay datos cargados, arrancar en Bienvenida (0)
      if (!parsedData?.mercadoLibreUser && !parsedData?.restaurantName) {
        return 0;
      }
      if (savedStep !== null) {
        const stepNum = parseInt(savedStep, 10);
        if (!isNaN(stepNum) && stepNum >= 0 && stepNum < STEPS.length) {
          return stepNum;
        }
      }
    } catch (e) {
      console.error('Error recuperando paso de localStorage:', e);
    }
    return 0;
  });

  // Sub-vista de Catálogo (0: Categorías, 1: Carga de Platos, 2: Destacados)
  const [catalogSubStep, setCatalogSubStep] = useState<0 | 1 | 2>(() => {
    try {
      const savedSub = localStorage.getItem(STORAGE_SUBSTEP_KEY);
      if (savedSub !== null) {
        const sub = parseInt(savedSub, 10);
        if (sub === 0 || sub === 1 || sub === 2) return sub;
      }
    } catch (e) {
      console.error('Error recuperando subpaso de catálogo:', e);
    }
    return 0;
  });

  // Tasa de cambio del Dólar Oficial del día de hoy
  const [dolarOficial, setDolarOficial] = useState<number>(1085);
  const [dolarFecha, setDolarFecha] = useState<string>('');

  useEffect(() => {
    const fetchDolar = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares/oficial');
        if (res.ok) {
          const json = await res.json();
          if (json.venta) {
            setDolarOficial(Math.round(json.venta));
            if (json.fechaActualizacion) {
              setDolarFecha(new Date(json.fechaActualizacion).toLocaleDateString('es-AR'));
            }
          }
        }
      } catch (err) {
        console.warn('Usando cotización de referencia oficial:', err);
      }
    };
    fetchDolar();
  }, []);

  const [newCategoryInput, setNewCategoryInput] = useState('');
  
  // Navegación paso a paso de categorías (un paso por categoría)
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CATEGORY_INDEX_KEY);
      if (saved !== null) {
        const idx = parseInt(saved, 10);
        if (!isNaN(idx) && idx >= 0) return idx;
      }
    } catch {}
    return 0;
  });

  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<'alias' | 'amount' | null>(null);
  const [submittedProject, setSubmittedProject] = useState<{
    id: string;
    restaurantName: string;
    managementPlanType: ManagementPlan;
    managementPlan: string;
    billingCycle?: BillingCycle;
    usdAmount: number;
    dolarRate: number;
    grossARS: number;
    discountARS: number;
    finalARS: number;
    whatsappNumber: string;
    dishesCount: number;
    categoriesCount: number;
    featuredCount: number;
  } | null>(null);

  const handleCopyValue = async (text: string, field: 'alias' | 'amount') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
      }, 2200);
    } catch {
      // Fallback silencioso si el navegador bloquea clipboard API
    }
  };

  // Sincronización continua de localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error guardando datos en localStorage:', e);
    }
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STEP_KEY, currentStepIndex.toString());
    } catch (e) {
      console.error('Error guardando paso en localStorage:', e);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStepIndex]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SUBSTEP_KEY, catalogSubStep.toString());
    } catch (e) {
      console.error('Error guardando subpaso en localStorage:', e);
    }
  }, [catalogSubStep]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CATEGORY_INDEX_KEY, currentCategoryIndex.toString());
    } catch {}
  }, [currentCategoryIndex]);

  const safeCategoryIndex = Math.min(
    Math.max(0, currentCategoryIndex),
    Math.max(0, data.categoriesList.length - 1)
  );
  const currentCategory = data.categoriesList[safeCategoryIndex] || '';

  const currentStep = STEPS[currentStepIndex];

  const getClientFolderName = () => {
    const restaurant = (data.restaurantName ?? '').trim();
    const user = (data.mercadoLibreUser ?? '').trim();
    if (restaurant && user) return `${restaurant}_(${user})`;
    if (restaurant) return restaurant;
    if (user) return user;
    return 'local_gastronomico';
  };

  const handleInputChange = <K extends keyof MenuFormData>(field: K, value: MenuFormData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // NAVEGACIÓN INTELIGENTE (INCLUYE SUB-PASOS DE CATÁLOGO Y PASO A PASO POR CATEGORÍA)
  const nextStep = () => {
    if (currentStep.id === 'CATALOG_SETUP') {
      if (catalogSubStep === 0) {
        setCatalogSubStep(1);
        setCurrentCategoryIndex(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (catalogSubStep === 1) {
        if (safeCategoryIndex < data.categoriesList.length - 1) {
          setCurrentCategoryIndex(safeCategoryIndex + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        } else {
          setCatalogSubStep(2);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    if (currentStepIndex < STEPS.length - 1) {
      setDirection(1);
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep.id === 'CATALOG_SETUP') {
      if (catalogSubStep === 2) {
        setCatalogSubStep(1);
        setCurrentCategoryIndex(Math.max(0, data.categoriesList.length - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (catalogSubStep === 1) {
        if (safeCategoryIndex > 0) {
          setCurrentCategoryIndex(safeCategoryIndex - 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        } else {
          setCatalogSubStep(0);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    if (currentStepIndex > 0) {
      setDirection(-1);
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // MÉTODOS DEL CREADOR DE CATÁLOGO
  const addCategory = (nameToAdd?: string) => {
    const catName = (nameToAdd || newCategoryInput).trim();
    if (!catName) return;

    if (!data.categoriesList.includes(catName)) {
      const updatedCategories = [...data.categoriesList, catName];
      const hasDishes = data.dishesList.some((d) => d.categoryName === catName);
      let updatedDishes = data.dishesList;
      if (!hasDishes) {
        updatedDishes = [
          ...data.dishesList,
          {
            id: `dish-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            categoryName: catName,
            name: '',
            price: '',
            description: '',
            imageUrl: ''
          }
        ];
      }

      setData((prev) => ({
        ...prev,
        categoriesList: updatedCategories,
        dishesList: updatedDishes
      }));
    }
    setNewCategoryInput('');
  };

  const removeCategory = (catToRemove: string) => {
    const updatedCategories = data.categoriesList.filter((c) => c !== catToRemove);
    const updatedDishes = data.dishesList.filter((d) => d.categoryName !== catToRemove);
    const removedDishIds = new Set(data.dishesList.filter((d) => d.categoryName === catToRemove).map((d) => d.id));
    const updatedFeatured = data.featuredDishIds.filter((id) => !removedDishIds.has(id));

    setData((prev) => ({
      ...prev,
      categoriesList: updatedCategories,
      dishesList: updatedDishes,
      featuredDishIds: updatedFeatured
    }));
  };

  const addDishToCategory = (categoryName: string) => {
    const newDish: DishItem = {
      id: `dish-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      categoryName,
      name: '',
      price: '',
      description: '',
      imageUrl: ''
    };
    setData((prev) => ({
      ...prev,
      dishesList: [...prev.dishesList, newDish]
    }));
  };

  const updateDish = (dishId: string, field: keyof DishItem, value: string) => {
    setData((prev) => {
      const updated = prev.dishesList.map((d) => {
        if (d.id === dishId) {
          return { ...d, [field]: value };
        }
        return d;
      });
      return { ...prev, dishesList: updated };
    });
  };

  const removeDish = (dishId: string) => {
    setData((prev) => ({
      ...prev,
      dishesList: prev.dishesList.filter((d) => d.id !== dishId),
      featuredDishIds: prev.featuredDishIds.filter((id) => id !== dishId)
    }));
  };

  const toggleFeaturedDish = (dishId: string) => {
    const isCurrentlySelected = data.featuredDishIds.includes(dishId);
    if (isCurrentlySelected) {
      setData((prev) => ({
        ...prev,
        featuredDishIds: prev.featuredDishIds.filter((id) => id !== dishId)
      }));
    } else {
      if (data.featuredDishIds.length < 6) {
        setData((prev) => ({
          ...prev,
          featuredDishIds: [...prev.featuredDishIds, dishId]
        }));
      }
    }
  };

  // MÉTODOS DE ZONAS DE DELIVERY
  const addDeliveryZone = () => {
    const newZone: DeliveryZone = {
      id: `zone-${Date.now()}`,
      name: '',
      cost: ''
    };
    setData((prev) => ({
      ...prev,
      deliveryZones: [...prev.deliveryZones, newZone]
    }));
  };

  const updateDeliveryZone = (index: number, field: 'name' | 'cost', value: string) => {
    setData((prev) => {
      const updated = [...prev.deliveryZones];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, deliveryZones: updated };
    });
  };

  const removeDeliveryZone = (index: number) => {
    setData((prev) => ({
      ...prev,
      deliveryZones: prev.deliveryZones.filter((_, i) => i !== index)
    }));
  };

  // VALIDACIÓN POR PASO Y MOTIVO ESPECÍFICO CUANDO FALTA UN DATO
  const getDisabledReason = (): string | null => {
    const stepId = currentStep.id;

    if (stepId === 'WELCOME') {
      return null;
    }
    if (stepId === 'PURCHASE_VALIDATION') {
      return (data.mercadoLibreUser ?? '').trim() === '' ? 'Ingresá tu usuario' : null;
    }
    if (stepId === 'RESTAURANT_IDENTITY') {
      return (data.restaurantName ?? '').trim() === '' ? 'Ingresá nombre del local' : null;
    }
    if (stepId === 'LOGO_UPLOAD') {
      return !data.noLogo && (data.logoUrl ?? '').trim() === '' ? 'Subí tu logo o marcá opción' : null;
    }
    if (stepId === 'VISUAL_STYLE') {
      return (data.primaryColor ?? '').trim() === '' || !data.themeTone ? 'Completá este paso' : null;
    }
    if (stepId === 'MANAGEMENT_PLAN') {
      if (!data.managementPlan) return 'Elegí un plan';
      if (data.managementPlan === 'vip' && !data.billingCycle) return 'Elegí un ciclo';
      return null;
    }
    if (stepId === 'CATALOG_SETUP') {
      if (catalogSubStep === 0) {
        return data.categoriesList.length === 0 ? 'Agregá 1 categoría' : null;
      }
      if (catalogSubStep === 1) {
        if (!currentCategory) return 'Agregá 1 categoría';
        const currentCatValidDishes = data.dishesList.filter(
          (d) => d.categoryName === currentCategory && d.name.trim() !== '' && d.price.trim() !== ''
        );
        return currentCatValidDishes.length === 0 ? 'Cargá 1 plato con precio' : null;
      }
      if (catalogSubStep === 2) {
        return data.featuredDishIds.length === 0 ? 'Elegí 1 plato destacado' : null;
      }
      return null;
    }
    if (stepId === 'LOGISTICS_WHATSAPP') {
      const cleanPhone = (data.whatsappNumber ?? '').replace(/\D/g, '');
      if (cleanPhone.length < 8) {
        return 'Falta WhatsApp (mín. 8 dígitos)';
      }
      if (!data.deliveryMethods.delivery && !data.deliveryMethods.takeaway) {
        return 'Elegí un método de entrega';
      }
      if (data.deliveryMethods.delivery) {
        if (data.deliveryZones.length === 0) {
          return 'Agregá 1 zona de envío';
        }
        const hasIncompleteZone = data.deliveryZones.some(
          (z) => z.name.trim() === '' || z.cost.trim() === ''
        );
        if (hasIncompleteZone) {
          return 'Completá zona y costo';
        }
      }
      return null;
    }
    if (stepId === 'PAYMENT_METHODS') {
      return (data.paymentCbuAlias ?? '').trim() === '' ||
        (data.paymentAccountHolder ?? '').trim() === '' ||
        (data.paymentBank ?? '').trim() === ''
        ? 'Completá datos de cobro'
        : null;
    }
    if (stepId === 'CLOSING_TERMS') {
      return !data.acceptedTerms ? 'Aceptá los términos' : null;
    }

    return null;
  };

  const isWhatsappValid = (data.whatsappNumber ?? '').replace(/\D/g, '').length >= 8;

  // ENVÍO FINAL A FIREBASE FIRESTORE
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const clientFolderName = getClientFolderName();
      const safeSlug = (data.restaurantName || data.mercadoLibreUser || 'menu_digital')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_');
      const documentId = `menudigital_${safeSlug}_${Date.now().toString().slice(-6)}`;

      const planNameFormatted =
        data.managementPlan === 'vip'
          ? `Plan Llave en Mano / VIP (${data.billingCycle.toUpperCase()})`
          : 'Plan Autogestionable ($0)';

      const vipPricing =
        data.managementPlan === 'vip'
          ? calculateVipPricing(data.billingCycle, dolarOficial)
          : null;

      const validDishesCount = data.dishesList.filter((d) => d.name.trim() !== '').length;

      const cleanData = {
        // METADATOS
        idProyecto: documentId,
        fechaCreacion: serverTimestamp(),
        fechaRegistroLocal: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
        estadoProyecto: 'PENDIENTE_DIGITALIZACION',
        tipoFormulario: 'Onboarding Menú Digital Inteligente',

        // 1. IDENTIFICACIÓN
        cliente: {
          usuarioMercadoLibre: data.mercadoLibreUser,
          nombreLocal: data.restaurantName,
          carpetaCloudinary: `${CLOUDINARY_BASE_FOLDER}/${clientFolderName.replace(/[<>:"/\\|?*#]+/g, '_').replace(/\s+/g, '_')}`
        },

        // 2. IDENTIDAD VISUAL
        identidadVisual: {
          logotipo: {
            tieneLogo: !data.noLogo,
            tipo: data.noLogo ? 'Formato texto tipográfico oficial' : 'Logotipo oficial adjuntado',
            url: data.noLogo ? null : data.logoUrl || null
          },
          colorPrincipal: data.primaryColor || '#DC2626',
          temaUI: data.themeTone === 'dark' ? 'Tema Oscuro (Nocturno / Premium)' : 'Tema Claro (Luminoso / Fresco)'
        },

        // 3. PLAN DE GESTIÓN Y SUSCRIPCIÓN
        planGestion: {
          tipo: data.managementPlan === 'vip' ? 'LLAVE_EN_MANO_VIP' : 'AUTOGESTIONABLE',
          nombrePlan: planNameFormatted,
          costoMensualBase: vipPricing ? `${vipPricing.usd} USD` : '$0',
          cicloFacturacion: data.managementPlan === 'vip' ? data.billingCycle : 'no_aplica',
          promoReintegro40k: data.managementPlan === 'vip' && data.billingCycle === 'anual',
          descuentoAplicadoARS: vipPricing ? vipPricing.discountARS : 0,
          montoBrutoARS: vipPricing ? vipPricing.grossARS : 0,
          montoFinalARS: vipPricing ? vipPricing.finalARS : 0,
          montoFinalFormateado: vipPricing ? `$${vipPricing.finalFormatted} ARS` : '$0 ARS',
          cotizacionDolarOficial: `$${dolarOficial} ARS`,
          monedaFacturacion: 'Abonable en ARS al cambio oficial del día'
        },

        // 4. CATÁLOGO COMPLETO
        catalogo: {
          categorias: data.categoriesList,
          platos: data.dishesList.filter((d) => d.name.trim() !== '' && d.price.trim() !== ''),
          platosEstrellaIds: data.featuredDishIds,
          totalPlatosCargados: validDishesCount
        },

        // 5. LOGÍSTICA & ENVÍOS
        logistica: {
          whatsappReceptor: data.whatsappNumber,
          modalidadesEntrega: {
            delivery: data.deliveryMethods.delivery,
            retiroLocal: data.deliveryMethods.takeaway
          },
          zonasEnvio: data.deliveryMethods.delivery
            ? data.deliveryZones.filter((z) => z.name.trim() !== '' && z.cost.trim() !== '')
            : []
        },

        // 6. MEDIOS DE COBRO
        mediosCobro: {
          cbuCvuAlias: data.paymentCbuAlias,
          titularCuenta: data.paymentAccountHolder,
          bancoOBilletera: data.paymentBank,
          aceptaEfectivoEntrega: data.acceptsCash
        },

        // 7. TÉRMINOS Y CONDICIONES
        terminosYCondiciones: {
          aceptado: data.acceptedTerms,
          fechaAceptacion: new Date().toISOString()
        }
      };

      const sanitizeForFirestore = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (obj instanceof Date) return obj;
        if (obj && typeof obj === 'object' && ('_methodName' in obj || obj.constructor?.name === 'FieldValue')) {
          return obj;
        }
        if (Array.isArray(obj)) {
          return obj.map((item) => sanitizeForFirestore(item));
        }
        const clean: Record<string, any> = {};
        for (const [key, val] of Object.entries(obj)) {
          clean[key] = val === undefined ? null : sanitizeForFirestore(val);
        }
        return clean;
      };

      await setDoc(doc(db, FIRESTORE_COLLECTION, documentId), sanitizeForFirestore(cleanData));

      // Limpiamos el localStorage tras el envío exitoso
      try {
        localStorage.removeItem(STORAGE_DATA_KEY);
        localStorage.removeItem(STORAGE_STEP_KEY);
        localStorage.removeItem(STORAGE_SUBSTEP_KEY);
        localStorage.removeItem(STORAGE_CATEGORY_INDEX_KEY);
      } catch (e) {
        console.error('Error limpiando localStorage:', e);
      }

      setCopiedField(null);
      setSubmittedProject({
        id: documentId,
        restaurantName: data.restaurantName || data.mercadoLibreUser || 'Local Gastronómico',
        managementPlanType: data.managementPlan,
        managementPlan: planNameFormatted,
        billingCycle: data.managementPlan === 'vip' ? data.billingCycle : undefined,
        usdAmount: vipPricing ? vipPricing.usd : 0,
        dolarRate: dolarOficial,
        grossARS: vipPricing ? vipPricing.grossARS : 0,
        discountARS: vipPricing ? vipPricing.discountARS : 0,
        finalARS: vipPricing ? vipPricing.finalARS : 0,
        whatsappNumber: data.whatsappNumber,
        dishesCount: validDishesCount,
        categoriesCount: data.categoriesList.length,
        featuredCount: data.featuredDishIds.length
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error registrando el menú en Firestore:', error);
      alert('Hubo un inconveniente al registrar la configuración. Por favor, verifica tu conexión a internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalFormSteps = 9;
  const progressPercent =
    currentStep.id === 'WELCOME'
      ? 0
      : Math.round((currentStep.stepNumber / totalFormSteps) * 100);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 25 : -25,
      opacity: 0,
      scale: 0.99
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -25 : 25,
      opacity: 0,
      scale: 0.99
    })
  };

  const primaryColorCss = parseColorToCss(data.primaryColor, '#DC2626');

  // Cálculos de precios en ARS al cambio oficial actual (con descuento de $39.990 en Anual 100 USD)
  const mensualPricing = calculateVipPricing('mensual', dolarOficial);
  const trimestralPricing = calculateVipPricing('trimestral', dolarOficial);
  const semestralPricing = calculateVipPricing('semestral', dolarOficial);
  const anualPricing = calculateVipPricing('anual', dolarOficial);
  const selectedVipPricing = calculateVipPricing(data.billingCycle || 'anual', dolarOficial);

  const precioMensualARS = mensualPricing.finalFormatted;
  const precioTrimestralARS = trimestralPricing.finalFormatted;
  const precioSemestralARS = semestralPricing.finalFormatted;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col items-center pt-20 sm:pt-24 px-3 sm:px-6 relative selection:bg-slate-950 selection:text-white">
      {/* HEADER SUPERIOR FIJO */}
      <header className="fixed top-0 left-0 w-full flex flex-col items-center z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)]">
        <div className="w-full max-w-4xl px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* BRANDING */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 p-1 min-w-0">
              <img
                src="/assets/Logo.webp"
                alt="AG Logo"
                className="h-6 sm:h-8 w-auto object-contain shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-950 tracking-tight leading-none flex items-center gap-1.5 truncate">
                  Menú Digital
                  <span className="hidden xs:inline">Inteligente</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                  AG Digital Studio
                </span>
              </div>
            </div>
          </div>

          {/* INDICADOR DE PASO */}
          {currentStep.id !== 'WELCOME' && !submittedProject && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-xs text-slate-600">
                <span className="font-medium hidden xs:inline">Paso</span>
                <span className="font-bold text-slate-950">{currentStep.stepNumber}</span>
                <span className="text-slate-400">/</span>
                <span className="font-medium text-slate-600">{totalFormSteps}</span>
              </div>
            </div>
          )}
        </div>

        {/* LÍNEA DE PROGRESO SUPERIOR */}
        {currentStep.id !== 'WELCOME' && !submittedProject && (
          <div className="w-full h-[2.5px] bg-slate-100 relative overflow-hidden">
            <motion.div
              className="h-full bg-slate-950"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        )}
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      {submittedProject ? (
        <main className="w-full max-w-2xl flex flex-col items-center justify-center py-6 sm:py-10 px-2 sm:px-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full glass-panel rounded-3xl p-5 sm:p-10 shadow-xl border border-slate-200/90 flex flex-col items-center text-center gap-5 sm:gap-6"
          >
            {submittedProject.managementPlanType === 'autogestionable' ? (
              <>
                {/* PANTALLA DE ÉXITO A: PLAN AUTOGESTIONABLE ($0) */}
                <div className="relative flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-lg border border-slate-800">
                    <CheckCircle2 size={40} className="text-white" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 max-w-lg">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Orden #{submittedProject.id.toUpperCase()} · Plan Autogestionable ($0)
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    Listo, ya nos ponemos a trabajar
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Los datos y el catálogo de{' '}
                    <strong className="text-slate-900 font-bold">{submittedProject.restaurantName}</strong> fueron
                    sincronizados correctamente en la base de datos de{' '}
                    <strong className="text-slate-900 font-bold">AG Digital Studio</strong>.
                  </p>
                </div>

                {/* ESTADO DE ALMACENAMIENTO */}
                <div className="w-full rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 sm:p-5 flex flex-col gap-3 text-left text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 font-semibold text-slate-700">
                    <span>Estado de Configuración & Base de Datos</span>
                    <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Sincronizado
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 text-slate-600">
                    <div className="flex items-baseline gap-2">
                      <span className="w-36 shrink-0 font-medium text-slate-500">Base de Datos:</span>
                      <span className="font-semibold text-slate-900 truncate">
                        Firebase Firestore ({FIRESTORE_COLLECTION})
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-36 shrink-0 font-medium text-slate-500">Plan de Gestión:</span>
                      <span className="font-semibold text-slate-900 truncate">{submittedProject.managementPlan}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-36 shrink-0 font-medium text-slate-500">Total Suscripción:</span>
                      <span className="font-bold text-emerald-700">$0 ARS</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-36 shrink-0 font-medium text-slate-500">WhatsApp Receptor:</span>
                      <span className="font-semibold text-slate-900 truncate">{submittedProject.whatsappNumber}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-36 shrink-0 font-medium text-slate-500">Platos Configurados:</span>
                      <span className="font-semibold text-slate-900 truncate">
                        {submittedProject.dishesCount} platos en {submittedProject.categoriesCount} categorías (
                        {submittedProject.featuredCount} destacados)
                      </span>
                    </div>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN PANTALLA A */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <a
                    href={`https://wa.me/${AGENCY_WHATSAPP}?text=${encodeURIComponent(
                      `¡Hola AG Digital Studio! Acabo de enviar el onboarding para el Menú Digital de "${submittedProject.restaurantName}" con Plan Autogestionable ($0) (Orden #${submittedProject.id.toUpperCase()}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-13 px-8 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-slate-800"
                  >
                    <WhatsAppIcon size={17} className="text-[#25D366]" />
                    <span>Avisar al equipo por WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedProject(null);
                      setCurrentStepIndex(0);
                      setCatalogSubStep(0);
                      setCurrentCategoryIndex(0);
                      setData(initialData);
                    }}
                    className="w-full sm:w-auto h-13 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer"
                  >
                    <span>Cargar otro formulario</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* PANTALLA DE ÉXITO B: PLAN VIP (CUALQUIER CICLO) */}
                <div className="relative flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-lg border-2 border-amber-400/70">
                    <CheckCircle2 size={40} className="text-amber-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 max-w-xl">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                    Orden #{submittedProject.id.toUpperCase()} · {submittedProject.managementPlan}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    ¡Excelente elección!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Para activar tu <strong className="text-slate-900 font-bold">Mantenimiento VIP</strong> y asegurar tu
                    descuento, completá el pago de la suscripción. Podés hacerlo transfiriendo al Alias:{' '}
                    <strong className="text-slate-950 font-black">{PAYMENT_ALIAS}</strong>. El monto al cambio de hoy es:{' '}
                    <strong className="text-slate-950 font-black">
                      ${submittedProject.finalARS.toLocaleString('es-AR')}
                    </strong>
                    .
                  </p>
                </div>

                {/* TARJETA DE PAGO: ALIAS Y DETALLE AL CAMBIO OFICIAL */}
                <div className="w-full rounded-2xl bg-white border-2 border-slate-900/90 shadow-md p-4 sm:p-6 flex flex-col gap-4 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <MercadoPagoIcon size={26} className="shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                          Pago de Suscripción · {submittedProject.restaurantName}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium">
                          Cotización Oficial: 1 USD = ${submittedProject.dolarRate.toLocaleString('es-AR')} ARS
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Ficha Guardada
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* ALIAS TRANSFERENCIA */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Alias Mercado Pago
                        </span>
                        <span className="text-base sm:text-lg font-black text-slate-950 tracking-tight truncate">
                          {PAYMENT_ALIAS}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyValue(PAYMENT_ALIAS, 'alias')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all shrink-0 cursor-pointer ${
                          copiedField === 'alias'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                        }`}
                      >
                        {copiedField === 'alias' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedField === 'alias' ? 'Copiado' : 'Copiar Alias'}</span>
                      </button>
                    </div>

                    {/* RESUMEN Y MONTO FINAL */}
                    <div className="p-3.5 rounded-xl bg-slate-950 text-white flex flex-col gap-2">
                      {submittedProject.discountARS > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Valor plan ({submittedProject.usdAmount} USD):</span>
                            <span className="text-slate-400 line-through decoration-rose-400/80 font-semibold">
                              ${submittedProject.grossARS.toLocaleString('es-AR')} ARS
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-400/20">
                            Descuento -${submittedProject.discountARS.toLocaleString('es-AR')} ARS
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
                            Monto al cambio de hoy
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            ${submittedProject.finalARS.toLocaleString('es-AR')}{' '}
                            <span className="text-xs font-bold text-slate-300">ARS</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyValue(submittedProject.finalARS.toString(), 'amount')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all shrink-0 cursor-pointer ${
                            copiedField === 'amount'
                              ? 'bg-emerald-500 text-white border-emerald-400'
                              : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                          }`}
                        >
                          {copiedField === 'amount' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedField === 'amount' ? 'Copiado' : 'Copiar monto'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTÓN FINAL ÚNICO WHATSAPP COMPROBANTE */}
                <div className="w-full flex flex-col items-center justify-center gap-2.5 pt-1">
                  <a
                    href={`https://wa.me/${AGENCY_WHATSAPP}?text=${encodeURIComponent(
                      `¡Hola AG Digital Studio! Ya realicé la transferencia para activar el Mantenimiento VIP (${submittedProject.billingCycle?.toUpperCase()} · ${submittedProject.usdAmount} USD) de "${submittedProject.restaurantName}" (Orden #${submittedProject.id.toUpperCase()}).\n\n• Monto al cambio de hoy ($${submittedProject.dolarRate.toLocaleString('es-AR')}): $${submittedProject.finalARS.toLocaleString('es-AR')} ARS${submittedProject.discountARS > 0 ? ` (descuento de $${submittedProject.discountARS.toLocaleString('es-AR')} ARS aplicado)` : ''}\n• Alias: ${PAYMENT_ALIAS}\n\nTe adjunto el comprobante por acá.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative overflow-hidden w-full sm:w-auto min-h-14 px-7 sm:px-9 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-slate-800 text-center"
                  >
                    <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
                    <WhatsAppIcon size={18} className="text-[#25D366] shrink-0" />
                    <span>Ya transferí, enviar comprobante a WhatsApp</span>
                  </a>
                </div>
              </>
            )}
          </motion.div>
        </main>
      ) : (
        <main className="w-full max-w-3xl flex flex-col pb-52 sm:pb-32 mt-1 sm:mt-4 px-0 transition-all duration-300">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col justify-center"
            >
              {/* ============================================================ */}
              {/* STEP 0: WELCOME */}
              {/* ============================================================ */}
              {currentStep.id === 'WELCOME' && (
                <StepWelcome onStart={nextStep} />
              )}

              {/* ============================================================ */}
              {/* PASO 1: Validación de Compra */}
              {/* ============================================================ */}
              {currentStep.id === 'PURCHASE_VALIDATION' && (
                <div className="flex flex-col gap-4 sm:gap-6 py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 01 · Identidad
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      ¿Cuál es tu usuario de Mercado Libre o email?
                    </h2>
                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
                      Lo necesitamos para asociar esta configuración a tu compra de forma inmediata y segura.
                    </p>
                  </div>

                  <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm flex flex-col gap-4 sm:gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">
                        Usuario de Mercado Libre o email *
                      </label>
                      <input
                        type="text"
                        value={data.mercadoLibreUser}
                        onChange={(e) => handleInputChange('mercadoLibreUser', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isNextDisabled()) {
                            e.preventDefault();
                            nextStep();
                          }
                        }}
                        placeholder="Ej: PIZZERIA_VENTAS o contacto@local.com"
                        className="w-full h-13 sm:h-14 bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 rounded-2xl px-4 sm:px-5 text-base font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                        autoFocus
                      />
                    </div>

                    <AgencyCopyTip message="Podés ingresar el seudónimo con el que compraste en Mercado Libre o el correo con el que recibiste la confirmación del pago." />
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 2: Identidad del Local */}
              {/* ============================================================ */}
              {currentStep.id === 'RESTAURANT_IDENTITY' && (
                <div className="flex flex-col gap-4 sm:gap-6 py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 02 · Identidad
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      ¿Cómo se llama tu local gastronómico?
                    </h2>
                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
                      Aparecerá en el encabezado oficial de tu menú web, pestaña del navegador y enlaces para tus clientes.
                    </p>
                  </div>

                  <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm flex flex-col gap-4 sm:gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">
                        Nombre de tu local gastronómico *
                      </label>
                      <input
                        type="text"
                        value={data.restaurantName}
                        onChange={(e) => handleInputChange('restaurantName', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isNextDisabled()) {
                            e.preventDefault();
                            nextStep();
                          }
                        }}
                        placeholder="Ej: Pizzería Don Antonio, Smash Burger Casanova"
                        className="w-full h-13 sm:h-14 bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 rounded-2xl px-4 sm:px-5 text-base font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                        autoFocus
                      />
                    </div>

                    <AgencyCopyTip message="Ingresá el nombre comercial tal como lo conocen tus comensales en redes sociales o cartelería." />
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 3: Carga de Logotipo */}
              {/* ============================================================ */}
              {currentStep.id === 'LOGO_UPLOAD' && (
                <div className="flex flex-col gap-4 sm:gap-6 py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 03 · Identidad
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      Subí el logotipo oficial de tu marca
                    </h2>
                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
                      Soportamos imágenes PNG o JPG. Nuestro equipo lo adaptará para que se vea perfecto en teléfonos y computadoras.
                    </p>
                  </div>

                  <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm flex flex-col gap-4 sm:gap-5">
                    {!data.noLogo && (
                      <ImageUpload
                        clientFolder={getClientFolderName()}
                        imageType="logotipo_local"
                        value={data.logoUrl}
                        onChange={(url) => handleInputChange('logoUrl', url)}
                        placeholderTitle="Subí el logotipo de tu local"
                        placeholderSubtitle="Arrastrá una imagen PNG o JPG o hacé clic para buscar"
                      />
                    )}

                    <label className="flex items-center gap-3 p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-100/60 transition-all select-none">
                      <input
                        type="checkbox"
                        checked={data.noLogo}
                        onChange={(e) => {
                          handleInputChange('noLogo', e.target.checked);
                          if (e.target.checked) handleInputChange('logoUrl', '');
                        }}
                        className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          Aún no tengo logotipo oficial
                        </span>
                        <span className="text-[11px] sm:text-xs text-slate-500">
                          Si marcás esta opción, usaremos el nombre del local en formato texto tipográfico elegante y moderno.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 4: Estilo Visual (Configuración UI del menú) */}
              {/* ============================================================ */}
              {currentStep.id === 'VISUAL_STYLE' && (
                <div className="flex flex-col gap-4 sm:gap-6 py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 04 · Diseño
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      Estilo visual: Colores y Tono
                    </h2>
                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
                      Definí cómo se verá tu menú en la pantalla de tus clientes. Mirá el resultado en vivo en la maqueta.
                    </p>
                  </div>

                  <div className="glass-panel rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col gap-6">
                    {/* MAQUETA INTERACTIVA DE MENÚ EN TIEMPO REAL */}
                    <div className="rounded-2xl p-3 sm:p-4 border border-slate-200 bg-slate-100/80 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold text-slate-400">
                          Vista previa en smartphone
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Simulación en Vivo
                        </span>
                      </div>

                      <div
                        className="rounded-2xl p-4 sm:p-5 border transition-all duration-300 flex flex-col gap-3 shadow-sm"
                        style={{
                          backgroundColor: data.themeTone === 'dark' ? '#0F172A' : '#FFFFFF',
                          color: data.themeTone === 'dark' ? '#F8FAFC' : '#0F172A',
                          borderColor: data.themeTone === 'dark' ? '#334155' : '#E2E8F0'
                        }}
                      >
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: data.themeTone === 'dark' ? '#1E293B' : '#F1F5F9' }}>
                          <div className="flex items-center gap-2">
                            {data.logoUrl && !data.noLogo ? (
                              <img src={data.logoUrl} alt="Logo" className="w-6 h-6 rounded object-cover" />
                            ) : (
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center font-black text-xs text-white"
                                style={{ backgroundColor: primaryColorCss }}
                              >
                                {data.restaurantName ? data.restaurantName.charAt(0).toUpperCase() : 'M'}
                              </div>
                            )}
                            <span className="font-extrabold text-xs sm:text-sm tracking-tight">
                              {data.restaurantName || 'Tu Local Gastronómico'}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `${primaryColorCss}25`, color: primaryColorCss }}>
                            Abierto Ahora
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-bold text-sm sm:text-base leading-tight truncate">
                              Burger Doble Cheddar & Bacon
                            </span>
                            <span className="text-xs opacity-70 line-clamp-1">
                              Doble medallón 120g, cheddar fundido, panceta crocante y pan de papa.
                            </span>
                            <span className="font-black text-sm pt-0.5" style={{ color: primaryColorCss }}>
                              $8.500
                            </span>
                          </div>

                          <button
                            type="button"
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs shrink-0 transition-transform active:scale-95 flex items-center gap-1.5"
                            style={{ backgroundColor: primaryColorCss }}
                          >
                            <ShoppingBag size={13} />
                            <span>Pedir</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* COMPONENTE A: SELECCIÓN DE COLOR PRINCIPAL */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                          Color Principal (Botones y Acentos) *
                        </label>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-black/15 shadow-2xs"
                            style={{ backgroundColor: primaryColorCss }}
                          />
                          <span className="text-xs font-mono font-bold text-slate-600 uppercase">
                            {data.primaryColor || '#DC2626'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { name: 'Rojo Fuego', hex: '#DC2626', hint: 'Parrillas & Hamburguesas' },
                          { name: 'Naranja Bistro', hex: '#EA580C', hint: 'Pizzerías & Empanadas' },
                          { name: 'Mostaza Gourmet', hex: '#D97706', hint: 'Fast Food & Cervecerías' },
                          { name: 'Borgoña / Vino', hex: '#881337', hint: 'Restaurantes & Carnes' },
                          { name: 'Verde Oliva', hex: '#15803D', hint: 'Saludable & Café' },
                          { name: 'Café & Cacao', hex: '#78350F', hint: 'Panaderías & Pastelería' },
                          { name: 'Negro Carbón', hex: '#18181B', hint: 'Fine Dining & Sushi' },
                          { name: 'Azul Bistro', hex: '#1E40AF', hint: 'Tabernas & Pastas' }
                        ].map((col) => {
                          const isSelected = data.primaryColor.toLowerCase() === col.hex.toLowerCase();
                          return (
                            <button
                              key={col.hex}
                              type="button"
                              onClick={() => handleInputChange('primaryColor', col.hex)}
                              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 active:scale-95 ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-900/[0.04] ring-2 ring-slate-900/10 shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                                  style={{ backgroundColor: col.hex }}
                                />
                                {isSelected && <Check size={14} className="text-slate-900" />}
                              </div>
                              <span className="font-bold text-xs text-slate-900">{col.name}</span>
                              <span className="text-[10px] text-slate-400 line-clamp-1">{col.hint}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="color"
                          value={data.primaryColor.startsWith('#') && data.primaryColor.length === 7 ? data.primaryColor : '#DC2626'}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          className="w-11 h-11 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-2xs"
                          title="Elegir color personalizado"
                        />
                        <input
                          type="text"
                          value={data.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          placeholder="O escribí un código HEX (Ej: #E11D48)"
                          className="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-base sm:text-sm font-semibold text-slate-900 focus:border-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    {/* COMPONENTE B: TEMA CLARO U OSCURO */}
                    <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                      <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Tono de Fondo del Menú *
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleInputChange('themeTone', 'light')}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between active:scale-98 ${
                            data.themeTone === 'light'
                              ? 'border-slate-900 bg-white ring-2 ring-slate-900 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200">
                              <Sun size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-sm text-slate-900">Tema Claro</span>
                              <span className="text-xs text-slate-500">Blancos y grises suaves, look fresco.</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${data.themeTone === 'light' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                            {data.themeTone === 'light' && <Check size={11} />}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInputChange('themeTone', 'dark')}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between active:scale-98 ${
                            data.themeTone === 'dark'
                              ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-300 flex items-center justify-center shrink-0 border border-slate-700">
                              <Moon size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-sm text-white">Tema Oscuro</span>
                              <span className="text-xs text-slate-300">Negros y carbón, look nocturno y VIP.</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${data.themeTone === 'dark' ? 'border-white bg-white text-slate-950' : 'border-slate-600'}`}>
                            {data.themeTone === 'dark' && <Check size={11} />}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 5: MODELO DE NEGOCIO Y SUSCRIPCIÓN (ÍCONOS HOMOGENEIZADOS) */}
              {/* ============================================================ */}
              {currentStep.id === 'MANAGEMENT_PLAN' && (
                <div className="flex flex-col gap-4 sm:gap-6 py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 05 · Modelo de Negocio & Suscripción
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      ¿Cómo preferís gestionar tu Menú de ahora en más?
                    </h2>
                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
                      Elegí si querés administrar los precios por tu cuenta o si preferís que nuestro equipo técnico se ocupe de todo.
                    </p>
                  </div>

                  {/* SECCIÓN A: SELECCIÓN DE MODALIDAD (2 CARDS GIGANTES) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {/* CARD 1: PLAN AUTOGESTIONABLE ($0/MES) - ÍCONOS HOMOGENEIZADOS */}
                    <div
                      onClick={() => handleInputChange('managementPlan', 'autogestionable')}
                      className={`rounded-2xl sm:rounded-3xl p-4.5 sm:p-7 border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 sm:gap-5 relative select-none ${
                        data.managementPlan === 'autogestionable'
                          ? 'border-slate-900 bg-white ring-4 ring-slate-900/5 shadow-xl scale-[1.01]'
                          : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col gap-2.5 sm:gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 sm:px-3 py-1 rounded-full">
                            Plan Autogestionable
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              data.managementPlan === 'autogestionable'
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-300'
                            }`}
                          >
                            {data.managementPlan === 'autogestionable' && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Hacelo vos mismo
                          </h3>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900">$0</span>
                            <span className="text-xs font-bold text-slate-400">/ mes (Costo mensual)</span>
                          </div>
                        </div>
                      </div>

                      {/* CHECKERS UI HOMOGENEIZADOS: CheckCircle2 y XCircle */}
                      <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100 text-xs">
                        <ul className="flex flex-col gap-2 sm:gap-2.5 text-slate-700">
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span>Entrega del sistema base.</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-rose-700">
                            <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                            <span>Gestión manual de precios por tu cuenta.</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-rose-700">
                            <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                            <span>Aprendizaje autodidacta.</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-rose-700">
                            <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                            <span>Sin diseño de banners.</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-rose-700">
                            <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                            <span>Sin soporte técnico gratuito pasados 30 días.</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* CARD 2: MANTENIMIENTO VIP (RECOMENDADO) - ÍCONOS HOMOGENEIZADOS */}
                    <div
                      onClick={() => handleInputChange('managementPlan', 'vip')}
                      className={`rounded-2xl sm:rounded-3xl p-4.5 sm:p-7 border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 sm:gap-5 relative select-none ${
                        data.managementPlan === 'vip'
                          ? 'border-slate-950 bg-slate-950 text-white ring-4 ring-slate-950/15 shadow-2xl scale-[1.01]'
                          : 'border-slate-300 bg-white hover:border-slate-900 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col gap-2.5 sm:gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-full ${data.managementPlan === 'vip' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-900 text-white'}`}>
                              ★ Recomendado
                            </span>
                            <span className={`text-xs font-semibold ${data.managementPlan === 'vip' ? 'text-slate-300' : 'text-slate-500'}`}>
                              Nosotros nos ocupamos
                            </span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              data.managementPlan === 'vip'
                                ? 'border-amber-400 bg-amber-400 text-slate-950'
                                : 'border-slate-300'
                            }`}
                          >
                            {data.managementPlan === 'vip' && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        <div>
                          <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${data.managementPlan === 'vip' ? 'text-white' : 'text-slate-900'}`}>
                            Mantenimiento VIP
                          </h3>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className={`text-2xl sm:text-3xl font-black ${data.managementPlan === 'vip' ? 'text-amber-400' : 'text-slate-900'}`}>
                              Llave en Mano
                            </span>
                            <span className={`text-xs font-bold ${data.managementPlan === 'vip' ? 'text-slate-400' : 'text-slate-500'}`}>
                              (Despreocupate de todo)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CHECKERS UI: CheckCircle2 */}
                      <div className={`flex flex-col gap-2.5 pt-3 border-t text-xs ${data.managementPlan === 'vip' ? 'border-slate-800' : 'border-slate-100'}`}>
                        <ul className={`flex flex-col gap-2 sm:gap-2.5 ${data.managementPlan === 'vip' ? 'text-slate-200' : 'text-slate-700'}`}>
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${data.managementPlan === 'vip' ? 'text-amber-400' : 'text-emerald-600'}`} />
                            <span><strong>Delegación total</strong> (nos mandás un WhatsApp y listo).</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${data.managementPlan === 'vip' ? 'text-amber-400' : 'text-emerald-600'}`} />
                            <span><strong>Actualizaciones de precios ilimitadas</strong>.</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${data.managementPlan === 'vip' ? 'text-amber-400' : 'text-emerald-600'}`} />
                            <span><strong>Diseño Premium</strong> (banners mensuales).</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${data.managementPlan === 'vip' ? 'text-amber-400' : 'text-emerald-600'}`} />
                            <span><strong>Soporte Prioritario 24/7</strong> con hosting incluido.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN B: CICLOS DE FACTURACIÓN (A TIPO DE CAMBIO DÓLAR OFICIAL ACTUAL) */}
                  <AnimatePresence>
                    {data.managementPlan === 'vip' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-md border-2 border-slate-900 flex flex-col gap-4 sm:gap-5 bg-slate-900/[0.02]">
                          {/* DISCLAIMER TEXTO SUPERIOR CON COTIZACIÓN DÓLAR OFICIAL ACTUAL */}
                          <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-blue-50/80 border border-blue-200/90 text-xs text-blue-900">
                            <Info size={17} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              Los valores están expresados en dólares (USD) para mantener la estabilidad del servicio. El pago se realiza en Pesos Argentinos (ARS) mediante transferencia al Tipo de Cambio Dólar Oficial del día (Cotización oficial de hoy: <strong>1 USD = ${dolarOficial.toLocaleString('es-AR')} ARS</strong>{dolarFecha ? ` · Actualizado al ${dolarFecha}` : ''}).
                            </p>
                          </div>

                          {/* LAYOUT GRID RESPONSIVE (FILAS EN MOBILE, GRID-COLS-3 EN DESKTOP) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                            {/* COLUMNA 1: MENSUAL */}
                            <label
                              onClick={() => handleInputChange('billingCycle', 'mensual')}
                              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex flex-row sm:flex-col items-center sm:items-stretch justify-between min-h-[64px] sm:h-28 select-none ${
                                data.billingCycle === 'mensual'
                                  ? 'border-slate-900 bg-white ring-2 ring-slate-900 shadow-sm'
                                  : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between sm:w-full">
                                <span className="font-extrabold text-sm text-slate-900">Mensual</span>
                                <div className={`hidden sm:flex w-4 h-4 rounded-full border items-center justify-center shrink-0 ${data.billingCycle === 'mensual' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                                  {data.billingCycle === 'mensual' && <Check size={10} />}
                                </div>
                              </div>
                              <div className="flex items-center sm:items-start justify-between sm:flex-col gap-2.5 sm:gap-0">
                                <div className="flex flex-col text-right sm:text-left sm:mt-1">
                                  <span className="text-base sm:text-xl font-black text-slate-900">10 USD</span>
                                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-semibold">~ ${precioMensualARS} ARS / mes</span>
                                </div>
                                <div className={`sm:hidden w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${data.billingCycle === 'mensual' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                                  {data.billingCycle === 'mensual' && <Check size={11} strokeWidth={3} />}
                                </div>
                              </div>
                            </label>

                            {/* COLUMNA 2: TRIMESTRAL */}
                            <label
                              onClick={() => handleInputChange('billingCycle', 'trimestral')}
                              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex flex-row sm:flex-col items-center sm:items-stretch justify-between min-h-[64px] sm:h-28 select-none ${
                                data.billingCycle === 'trimestral'
                                  ? 'border-slate-900 bg-white ring-2 ring-slate-900 shadow-sm'
                                  : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between sm:w-full">
                                <span className="font-extrabold text-sm text-slate-900">Trimestral</span>
                                <div className={`hidden sm:flex w-4 h-4 rounded-full border items-center justify-center shrink-0 ${data.billingCycle === 'trimestral' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                                  {data.billingCycle === 'trimestral' && <Check size={10} />}
                                </div>
                              </div>
                              <div className="flex items-center sm:items-start justify-between sm:flex-col gap-2.5 sm:gap-0">
                                <div className="flex flex-col text-right sm:text-left sm:mt-1">
                                  <span className="text-base sm:text-xl font-black text-slate-900">25 USD</span>
                                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-semibold">~ ${precioTrimestralARS} ARS total</span>
                                </div>
                                <div className={`sm:hidden w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${data.billingCycle === 'trimestral' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                                  {data.billingCycle === 'trimestral' && <Check size={11} strokeWidth={3} />}
                                </div>
                              </div>
                            </label>

                            {/* COLUMNA 3: SEMESTRAL */}
                            <label
                              onClick={() => handleInputChange('billingCycle', 'semestral')}
                              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex flex-row sm:flex-col items-center sm:items-stretch justify-between min-h-[64px] sm:h-28 select-none ${
                                data.billingCycle === 'semestral'
                                  ? 'border-slate-900 bg-white ring-2 ring-slate-900 shadow-sm'
                                  : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between sm:w-full">
                                <span className="font-extrabold text-sm text-slate-900">Semestral</span>
                                <div className={`hidden sm:flex w-4 h-4 rounded-full border items-center justify-center shrink-0 ${data.billingCycle === 'semestral' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                                  {data.billingCycle === 'semestral' && <Check size={10} />}
                                </div>
                              </div>
                              <div className="flex items-center sm:items-start justify-between sm:flex-col gap-2.5 sm:gap-0">
                                <div className="flex flex-col text-right sm:text-left sm:mt-1">
                                  <span className="text-base sm:text-xl font-black text-slate-900">45 USD</span>
                                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-semibold">~ ${precioSemestralARS} ARS total</span>
                                </div>
                                <div className={`sm:hidden w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${data.billingCycle === 'semestral' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                                  {data.billingCycle === 'semestral' && <Check size={11} strokeWidth={3} />}
                                </div>
                              </div>
                            </label>
                          </div>

                          {/* LAYOUT FULL WIDTH: CARD ANUAL (100 USD CON DESCUENTO EN VIVO DE $39.990 ARS) */}
                          <label
                            onClick={() => handleInputChange('billingCycle', 'anual')}
                            className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 select-none ${
                              data.billingCycle === 'anual'
                                ? 'border-amber-500 bg-amber-50/90 ring-4 ring-amber-500/15 shadow-lg'
                                : 'border-amber-300/80 bg-amber-50/40 hover:bg-amber-50/80'
                            }`}
                          >
                            <div className="flex items-start gap-3 sm:gap-3.5">
                              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md mt-0.5">
                                <Flame size={22} />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-slate-950 text-sm sm:text-lg">
                                    ANUAL: 100 USD
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-amber-950 font-bold bg-amber-200/80 px-2 py-0.5 rounded-md">
                                    Más Elegido
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200/80">
                                    -$39.990 ARS bonificado
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 mt-1">
                                  <span className="text-xs sm:text-sm text-slate-400 line-through decoration-rose-500/75 decoration-[1.5px] font-semibold">
                                    ${anualPricing.grossFormatted} ARS
                                  </span>
                                  <span className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
                                    ${anualPricing.finalFormatted} ARS{' '}
                                    <span className="text-[11px] font-semibold text-slate-600">final / año</span>
                                  </span>
                                </div>

                                <p className="text-[11px] sm:text-xs text-amber-900/90 font-semibold mt-1">
                                  PROMO: Aplicamos un descuento directo de $39.990 ARS (reintegro de costo inicial) sobre los 100 USD al cambio de hoy.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-end sm:justify-center">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  data.billingCycle === 'anual'
                                    ? 'border-amber-600 bg-amber-500 text-white'
                                    : 'border-amber-300 bg-white'
                                }`}
                              >
                                {data.billingCycle === 'anual' && <Check size={12} strokeWidth={3} />}
                              </div>
                            </div>
                          </label>

                          {/* RESUMEN EN VIVO DEL TOTAL DE SUSCRIPCIÓN */}
                          <VipTotalSummaryBanner
                            pricing={selectedVipPricing}
                            dolarFecha={dolarFecha}
                            eyebrowPrefix="Total en vivo"
                            totalLabel="Total hoy:"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 6: CREADOR DE CATÁLOGO (CON CARGA DE IMAGEN POR PLATO) */}
              {/* ============================================================ */}
              {currentStep.id === 'CATALOG_SETUP' && (
                <div className="flex flex-col gap-3.5 sm:gap-6 py-1 sm:py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 6 · Catálogo
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      Tu Menú y Precios
                    </h2>
                    <p className="hidden sm:block text-xs sm:text-base text-slate-500 leading-relaxed">
                      Definí tus categorías, cargá tus platos con sus fotos y elegí hasta 6 destacados para la portada.
                    </p>
                  </div>

                  {/* SUB-TABS INTERACTIVOS: CATEGORÍAS, PLATOS, DESTACADOS */}
                  <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl w-full text-xs font-bold gap-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCatalogSubStep(0)}
                      className={`flex-1 py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 active:scale-98 ${
                        catalogSubStep === 0
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      <span>Categorías</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono shrink-0">
                        {data.categoriesList.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (data.categoriesList.length > 0) setCatalogSubStep(1);
                      }}
                      disabled={data.categoriesList.length === 0}
                      className={`flex-1 py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 active:scale-98 ${
                        catalogSubStep === 1
                          ? 'bg-white text-slate-950 shadow-sm'
                          : data.categoriesList.length === 0
                          ? 'text-slate-400 cursor-not-allowed opacity-50'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      <span>Platos</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono shrink-0">
                        {data.dishesList.filter((d) => d.name.trim() !== '' && d.price.trim() !== '').length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const valid = data.dishesList.filter((d) => d.name.trim() !== '' && d.price.trim() !== '');
                        if (valid.length > 0) setCatalogSubStep(2);
                      }}
                      disabled={data.dishesList.filter((d) => d.name.trim() !== '' && d.price.trim() !== '').length === 0}
                      className={`flex-1 py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 active:scale-98 ${
                        catalogSubStep === 2
                          ? 'bg-white text-slate-950 shadow-sm'
                          : data.dishesList.filter((d) => d.name.trim() !== '' && d.price.trim() !== '').length === 0
                          ? 'text-slate-400 cursor-not-allowed opacity-50'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      <span>Destacados</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${data.featuredDishIds.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                        {data.featuredDishIds.length}/6
                      </span>
                    </button>
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* 7A. CREACIÓN DE CATEGORÍAS */}
                  {/* ---------------------------------------------------- */}
                  {catalogSubStep === 0 && (
                    <motion.div
                      key="catalog-7a"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm flex flex-col gap-5 sm:gap-6"
                    >
                      <div className="flex flex-col gap-1">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                          Tus Categorías
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Agregá las secciones principales de tu carta. Tus clientes navegarán tu menú a través de ellas.
                        </p>
                      </div>

                      {/* INPUT + BOTÓN AGREGAR */}
                      <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <input
                          type="text"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCategory();
                            }
                          }}
                          placeholder="Nombre de la categoría (ej: Pizzas, Empanadas, Lomitos)"
                          className="flex-1 w-full h-13 bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white rounded-2xl px-4 text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => addCategory()}
                          disabled={!newCategoryInput.trim()}
                          className={`w-full sm:w-auto h-13 px-6 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            newCategoryInput.trim()
                              ? 'bg-slate-950 hover:bg-slate-900 text-white shadow-md'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Plus size={16} />
                          <span>Agregar Categoría</span>
                        </button>
                      </div>

                      {/* SUGERENCIAS RÁPIDAS */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">
                          Sugerencias rápidas:
                        </span>
                        {['Hamburguesas', 'Pizzas', 'Empanadas', 'Lomitos', 'Papas Fritas', 'Bebidas', 'Postres'].map(
                          (sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => addCategory(sug)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                            >
                              + {sug}
                            </button>
                          )
                        )}
                      </div>

                      {/* CATEGORÍAS RENDERIZADAS COMO TAGS */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Tus Categorías Creadas ({data.categoriesList.length}):
                        </span>

                        {data.categoriesList.length === 0 ? (
                          <div className="p-5 sm:p-6 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                            Aún no agregaste categorías. Escribí un nombre arriba y hacé clic en "Agregar Categoría".
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 sm:gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                            {data.categoriesList.map((cat) => (
                              <div
                                key={cat}
                                className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 sm:pl-3.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold shadow-2xs group"
                              >
                                <span>{cat}</span>
                                <button
                                  type="button"
                                  onClick={() => removeCategory(cat)}
                                  className="w-5 h-5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-all cursor-pointer"
                                  title={`Eliminar categoría ${cat}`}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* CARGA DE PLATOS (POR CATEGORÍA, PASO A PASO) */}
                  {/* ---------------------------------------------------- */}
                  {catalogSubStep === 1 && (
                    <motion.div
                      key={`catalog-category-${safeCategoryIndex}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-4 sm:gap-5"
                    >
                      {/* BARRA DE PROGRESO DE CATEGORÍAS */}
                      <div className="flex flex-col gap-2.5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                            Categoría {safeCategoryIndex + 1} de {data.categoriesList.length}
                          </span>
                          <span className="font-semibold text-slate-600">
                            {data.dishesList.filter((d) => d.categoryName === currentCategory && d.name.trim() !== '' && d.price.trim() !== '').length} platos cargados
                          </span>
                        </div>

                        {/* TRACK PROGRESS BAR */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-950 transition-all duration-300"
                            style={{
                              width: `${((safeCategoryIndex + 1) / Math.max(1, data.categoriesList.length)) * 100}%`,
                            }}
                          />
                        </div>

                        {/* TÍTULO DE LA CATEGORÍA ACTUAL */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                              {currentCategory}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Cargá los platos y precios para esta categoría.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCatalogSubStep(0)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Categorías
                          </button>
                        </div>
                      </div>

                      {/* LISTADO DE PLATOS DE LA CATEGORÍA ACTUAL */}
                      {(() => {
                        const categoryDishes = data.dishesList.filter((d) => d.categoryName === currentCategory);

                        return (
                          <div className="flex flex-col gap-3.5">
                            {categoryDishes.length === 0 ? (
                              <div className="p-6 rounded-2xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center gap-3 text-center">
                                <p className="text-xs text-slate-500 font-medium">
                                  No tenés platos en la sección <strong className="text-slate-800">{currentCategory}</strong>.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => addDishToCategory(currentCategory)}
                                  className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Plus size={14} />
                                  <span>Agregar primer plato</span>
                                </button>
                              </div>
                            ) : (
                              categoryDishes.map((dish, dIdx) => (
                                <div
                                  key={dish.id}
                                  className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-3.5 transition-all"
                                >
                                  {/* HEADER DE PLATO */}
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <span className="text-xs font-bold text-slate-700">
                                      Plato #{dIdx + 1}
                                    </span>
                                    {categoryDishes.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeDish(dish.id)}
                                        className="text-xs text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded"
                                        title="Eliminar plato"
                                      >
                                        <Trash2 size={13} />
                                        <span>Eliminar</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* FOTO HERO LIMPIA */}
                                  <DishImageUpload
                                    value={dish.imageUrl}
                                    onChange={(url) => updateDish(dish.id, 'imageUrl', url)}
                                    clientFolder={getClientFolderName()}
                                    dishName={dish.name}
                                  />

                                  {/* CAMPOS PRINCIPALES: NOMBRE Y PRECIO */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                                      <label className="text-xs font-semibold text-slate-700">
                                        Nombre del plato *
                                      </label>
                                      <input
                                        type="text"
                                        value={dish.name}
                                        onChange={(e) => updateDish(dish.id, 'name', e.target.value)}
                                        placeholder={
                                          currentCategory.toLowerCase().includes('bebid')
                                            ? 'Ej: Gaseosa 500ml'
                                            : currentCategory.toLowerCase().includes('pizz')
                                            ? 'Ej: Pizza Muzzarella Especial'
                                            : currentCategory.toLowerCase().includes('empanad')
                                            ? 'Ej: Empanada de Carne'
                                            : currentCategory.toLowerCase().includes('postr')
                                            ? 'Ej: Flan Casero'
                                            : currentCategory.toLowerCase().includes('lomi')
                                            ? 'Ej: Lomito Completo'
                                            : 'Ej: Doble Cheeseburger'
                                        }
                                        className="w-full h-11 sm:h-12 bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-xl px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                                      />
                                    </div>

                                    <div className="sm:col-span-1 flex flex-col gap-1.5">
                                      <label className="text-xs font-semibold text-slate-700">
                                        Precio ($) *
                                      </label>
                                      <div className="relative flex items-center">
                                        <span className="absolute left-3.5 text-sm font-semibold text-slate-400 pointer-events-none">$</span>
                                        <input
                                          type="text"
                                          value={dish.price.replace(/^\$\s*/, '')}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            updateDish(dish.id, 'price', val ? `$${val.replace(/^\$\s*/, '')}` : '');
                                          }}
                                          placeholder="8.500"
                                          className="w-full h-11 sm:h-12 bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-xl pl-7 pr-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* DESCRIPCIÓN */}
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-500">
                                      Descripción o ingredientes (opcional)
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={dish.description || ''}
                                      onChange={(e) => updateDish(dish.id, 'description', e.target.value)}
                                      placeholder={
                                        currentCategory.toLowerCase().includes('bebid')
                                          ? 'Ej: Presentación 500ml servida bien fría'
                                          : currentCategory.toLowerCase().includes('pizz')
                                          ? 'Ej: Salsa casera de tomates, muzzarella y aceitunas negras'
                                          : currentCategory.toLowerCase().includes('empanad')
                                          ? 'Ej: Relleno de carne cortada a cuchillo con cebolla de verdeo y huevo'
                                          : 'Ej: Doble medallón 120g de carne, queso cheddar y pan de papa'
                                      }
                                      className="w-full rounded-xl bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 p-3 text-sm font-normal text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none leading-relaxed"
                                    />
                                  </div>
                                </div>
                              ))
                            )}

                            {/* BOTÓN AGREGAR OTRO PLATO */}
                            <button
                              type="button"
                              onClick={() => addDishToCategory(currentCategory)}
                              className="w-full h-11 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Plus size={15} />
                              <span>Agregar otro plato a {currentCategory}</span>
                            </button>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* 7C. SELECCIÓN DE DESTACADOS (HASTA 6 PLATOS ESTRELLA) */}
                  {/* ---------------------------------------------------- */}
                  {catalogSubStep === 2 && (
                    <motion.div
                      key="catalog-7c"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span>Elegí tus 6 platos estrella</span>
                            <Star size={18} className="text-amber-500 fill-amber-500" />
                          </h3>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${data.featuredDishIds.length === 6 ? 'bg-amber-100 text-amber-900 font-black' : 'bg-slate-100 text-slate-600'}`}>
                            {data.featuredDishIds.length} de 6 seleccionados
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Estos platos irán al principio de tu menú web como el gancho principal de ventas.
                        </p>
                      </div>

                      {/* RENDERIZADO EN GRILLA CON FOTO INCLUIDA */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.dishesList
                          .filter((d) => d.name.trim() !== '')
                          .map((dish) => {
                            const isSelected = data.featuredDishIds.includes(dish.id);
                            const isMaxReached = data.featuredDishIds.length >= 6;
                            const isDisabled = isMaxReached && !isSelected;

                            return (
                              <div
                                key={dish.id}
                                onClick={() => {
                                  if (!isDisabled) toggleFeaturedDish(dish.id);
                                }}
                                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 relative select-none ${
                                  isSelected
                                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
                                    : isDisabled
                                    ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {dish.imageUrl ? (
                                    <img
                                      src={dish.imageUrl}
                                      alt={dish.name}
                                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                                      <ShoppingBag size={18} />
                                    </div>
                                  )}
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      {dish.categoryName}
                                    </span>
                                    <span className="font-extrabold text-sm text-slate-900 truncate">
                                      {dish.name}
                                    </span>
                                    <span className="font-black text-xs text-slate-900 mt-0.5">
                                      {dish.price}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'border-amber-500 bg-amber-500 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check size={14} strokeWidth={3} />}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {data.featuredDishIds.length === 6 && (
                        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold text-center">
                          ¡Listo! Ya seleccionaste los 6 platos estrella para la portada. Si querés cambiar alguno, desmarcá uno primero.
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 7: LOGÍSTICA Y ENVÍOS (SOLO DELIVERY Y RETIRO POR LOCAL) */}
              {/* ============================================================ */}
              {currentStep.id === 'LOGISTICS_WHATSAPP' && (
                <div className="flex flex-col gap-4 sm:gap-6 py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 07 · Logística y Envíos
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      Recepción de Pedidos y Envíos
                    </h2>
                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
                      Configurá el número al que tus clientes enviarán los pedidos y las modalidades de entrega habilitadas.
                    </p>
                  </div>

                  <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm flex flex-col gap-4 sm:gap-6">
                    {/* INPUT 1: WHATSAPP REQUERIDO */}
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                          Número de WhatsApp Receptor (Requerido) *
                        </label>
                        {isWhatsappValid ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            Número válido
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            Falta número (mín. 8 dígitos)
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 flex items-center gap-1.5 text-slate-500 font-bold text-sm pointer-events-none">
                          <WhatsAppIcon size={16} className="text-[#25D366]" />
                        </div>
                        <input
                          id="logistics-whatsapp-input"
                          type="tel"
                          value={data.whatsappNumber}
                          onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                          placeholder="Ej: +54 9 11..."
                          className={`w-full h-13 sm:h-14 bg-slate-50/70 border hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 rounded-2xl pl-11 pr-5 text-base font-bold text-slate-900 outline-none transition-all shadow-2xs ${
                            isWhatsappValid ? 'border-slate-200' : 'border-amber-300'
                          }`}
                        />
                      </div>
                      <span className="text-xs text-slate-500 ml-1">
                        Formato internacional con código de área (ej: <strong>+54 9 11 1234 5678</strong>). Los pedidos se enviarán preformateados a esta línea.
                      </span>
                    </div>

                    {/* CHECKBOXES OPCIONES DE ENTREGA: SOLO DELIVERY Y RETIRO POR LOCAL */}
                    <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                      <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Opciones de Entrega Habilitadas *
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        {/* DELIVERY */}
                        <label
                          onClick={() =>
                            setData((prev) => ({
                              ...prev,
                              deliveryMethods: {
                                ...prev.deliveryMethods,
                                delivery: !prev.deliveryMethods.delivery
                              }
                            }))
                          }
                          className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between select-none ${
                            data.deliveryMethods.delivery
                              ? 'border-slate-900 bg-slate-900/[0.04] ring-2 ring-slate-900'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <Bike size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-sm text-slate-900">Delivery</span>
                              <span className="text-xs text-slate-500">Envíos a domicilio</span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 ${data.deliveryMethods.delivery ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                            {data.deliveryMethods.delivery && <Check size={12} strokeWidth={3} />}
                          </div>
                        </label>

                        {/* RETIRO POR LOCAL */}
                        <label
                          onClick={() =>
                            setData((prev) => ({
                              ...prev,
                              deliveryMethods: {
                                ...prev.deliveryMethods,
                                takeaway: !prev.deliveryMethods.takeaway
                              }
                            }))
                          }
                          className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between select-none ${
                            data.deliveryMethods.takeaway
                              ? 'border-slate-900 bg-slate-900/[0.04] ring-2 ring-slate-900'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                              <Store size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-sm text-slate-900">Retiro por Local</span>
                              <span className="text-xs text-slate-500">Take away / Mostrador</span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 ${data.deliveryMethods.takeaway ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}>
                            {data.deliveryMethods.takeaway && <Check size={12} strokeWidth={3} />}
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* COMPONENTE ZONAS DE ENVÍO */}
                    {data.deliveryMethods.delivery && (
                      <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide block">
                              Zonas de Envío (Requerido) *
                            </span>
                            <span className="text-xs text-slate-500">
                              Agregá las zonas o barrios y su costo de envío correspondiente.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={addDeliveryZone}
                            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Plus size={14} />
                            <span>Agregar Zona de Envío</span>
                          </button>
                        </div>

                        {/* NOTA EXPLICATIVA PARA EVITAR MALOS ENTENDIDOS */}
                        <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-xl bg-amber-50/85 border border-amber-200/90 text-xs text-amber-950 leading-relaxed">
                          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                          <p>
                            <strong className="font-bold">Nota importante:</strong> Como activaste{' '}
                            <strong className="font-bold">Delivery</strong>, debés cargar al menos{' '}
                            <strong className="font-bold">1 zona con nombre y costo</strong> para continuar. Si agregás
                            una fila y la dejás vacía o incompleta, el botón <strong className="font-bold">Continuar</strong>{' '}
                            no se habilitará hasta que la completes o la elimines con el ícono del tacho.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          {data.deliveryZones.length === 0 ? (
                            <div className="p-4 rounded-2xl border border-dashed border-amber-300 text-center text-xs text-slate-600 bg-amber-50/30">
                              Todavía no agregaste zonas de envío. Tocá en{' '}
                              <strong className="text-slate-900">Agregar Zona de Envío</strong> arriba para cargar tu primera zona.
                            </div>
                          ) : (
                            <>
                              {data.deliveryZones.map((zone, idx) => {
                                const isNameEmpty = zone.name.trim() === '';
                                const isCostEmpty = zone.cost.trim() === '';
                                const isZoneIncomplete = isNameEmpty || isCostEmpty;

                                return (
                                  <div
                                    key={zone.id || idx}
                                    className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${
                                      isZoneIncomplete
                                        ? 'bg-amber-50/30 border-amber-300/90'
                                        : 'bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between px-0.5">
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Zona #{idx + 1}
                                      </span>
                                      {isZoneIncomplete ? (
                                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                          Completá zona y costo
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                          Lista
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                                      <div className="flex flex-col gap-1 flex-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                                          Zona o barrio *
                                        </label>
                                        <input
                                          type="text"
                                          value={zone.name}
                                          onChange={(e) => updateDeliveryZone(idx, 'name', e.target.value)}
                                          placeholder="Ej: Palermo, San Isidro, Centro"
                                          className={`w-full h-11 bg-white border rounded-xl px-3 text-base sm:text-sm font-semibold text-slate-900 outline-none transition-all ${
                                            isNameEmpty
                                              ? 'border-amber-300 focus:border-slate-900'
                                              : 'border-slate-200 focus:border-slate-900'
                                          }`}
                                        />
                                      </div>

                                      <div className="flex items-end gap-2 w-full sm:w-auto">
                                        <div className="flex flex-col gap-1 flex-1 sm:w-36">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                                            Costo de envío *
                                          </label>
                                          <input
                                            type="text"
                                            value={zone.cost}
                                            onChange={(e) => updateDeliveryZone(idx, 'cost', e.target.value)}
                                            placeholder="Ej: $2.500 o Gratis"
                                            className={`w-full h-11 bg-white border rounded-xl px-3 text-base sm:text-sm font-bold text-slate-900 outline-none transition-all ${
                                              isCostEmpty
                                                ? 'border-amber-300 focus:border-slate-900'
                                                : 'border-slate-200 focus:border-slate-900'
                                            }`}
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeDeliveryZone(idx)}
                                          className="w-11 h-11 rounded-xl bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shrink-0"
                                          title="Eliminar fila de zona"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 8: MEDIOS DE COBRO (INPUTS PERFECTAMENTE ALINEADOS) */}
              {/* ============================================================ */}
              {currentStep.id === 'PAYMENT_METHODS' && (
                <div className="flex flex-col gap-4 sm:gap-6 py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 08 · Checkout & Cobros
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      ¿Cómo te van a pagar tus clientes?
                    </h2>
                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
                      Ingresá los datos de la cuenta a la que el cliente debe transferir.
                    </p>
                  </div>

                  <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm flex flex-col gap-4 sm:gap-5">
                    {/* INPUT 1: CBU / CVU / ALIAS */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                        CBU / CVU / Alias *
                      </label>
                      <input
                        type="text"
                        value={data.paymentCbuAlias}
                        onChange={(e) => handleInputChange('paymentCbuAlias', e.target.value)}
                        placeholder="Ej: burger.casanova.mp o 00000031000..."
                        className="w-full h-13 sm:h-14 bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 rounded-2xl px-4 sm:px-5 text-base font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs font-mono"
                        autoFocus
                      />
                    </div>

                    {/* INPUTS 2 Y 3: PERFECTAMENTE ALINEADOS HORIZONTALMENTE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* TITULAR DE LA CUENTA */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                          Titular de la cuenta bancaria *
                        </label>
                        <input
                          type="text"
                          value={data.paymentAccountHolder}
                          onChange={(e) => handleInputChange('paymentAccountHolder', e.target.value)}
                          placeholder="Ej: Juan Pérez o Burger SRL"
                          className="w-full h-13 sm:h-14 bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white rounded-2xl px-4 text-base sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                        />
                      </div>

                      {/* BANCO O BILLETERA VIRTUAL */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                          Banco o Billetera Virtual *
                        </label>
                        <input
                          type="text"
                          value={data.paymentBank}
                          onChange={(e) => handleInputChange('paymentBank', e.target.value)}
                          placeholder="Ej: Mercado Pago, Galicia, Brubank"
                          className="w-full h-13 sm:h-14 bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white rounded-2xl px-4 text-base sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* TOGGLE / SWITCH: ¿ACEPTÁS PAGO EN EFECTIVO? */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                          ¿Aceptás pago en efectivo al momento de la entrega/retiro?
                        </span>
                        <span className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                          {data.acceptsCash
                            ? 'Sí, el cliente podrá optar por abonar en efectivo al recibir el pedido.'
                            : 'No, únicamente pedidos abonados previamente por transferencia con comprobante.'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInputChange('acceptsCash', !data.acceptsCash)}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          data.acceptsCash ? 'bg-slate-950' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            data.acceptsCash ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 9: REVISIÓN FINAL Y PUESTA EN MARCHA */}
              {/* ============================================================ */}
              {currentStep.id === 'CLOSING_TERMS' && (
                <div className="flex flex-col gap-4 sm:gap-6 py-2">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="text-[11px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                      Paso 09 · Confirmación & Cierre
                    </span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                      Revisión Final y Puesta en Marcha
                    </h2>
                    <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
                      Verificá los datos de tu Menú Digital antes de enviarlos a producción técnica.
                    </p>
                  </div>

                  {/* RESUMEN VISUAL EN 4 CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* CARD 1: IDENTIDAD */}
                    <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                        <span>01 · Identidad Visual</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      </div>
                      <div className="flex flex-col gap-1.5 text-xs text-slate-700 pt-2">
                        <div>
                          <strong className="text-slate-900 text-sm block">{data.restaurantName}</strong>
                          <span className="text-slate-600 text-[11px] font-medium">ML: {data.mercadoLibreUser}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: primaryColorCss }}
                          />
                          <span className="font-semibold text-slate-700">
                            {data.themeTone === 'dark' ? 'Tema Oscuro' : 'Tema Claro'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: PLAN DE GESTIÓN */}
                    <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                        <span>02 · Plan Elegido</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-slate-700 pt-2">
                        <strong className="text-slate-900 text-sm">
                          {data.managementPlan === 'vip' ? 'Mantenimiento VIP Llave en Mano' : 'Plan Autogestionable ($0)'}
                        </strong>
                        {data.managementPlan === 'vip' ? (
                          <>
                            <div className="flex flex-wrap items-center gap-1.5 font-semibold text-amber-800">
                              <span>
                                Ciclo {data.billingCycle.toUpperCase()} ({selectedVipPricing.usd} USD)
                              </span>
                              {selectedVipPricing.discountARS > 0 && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                  -$39.990 ARS
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-baseline gap-1.5 pt-0.5">
                              {selectedVipPricing.discountARS > 0 && (
                                <span className="text-slate-500 line-through text-[11px] font-semibold">
                                  ${selectedVipPricing.grossFormatted} ARS
                                </span>
                              )}
                              <span className="text-slate-950 font-black text-xs sm:text-sm">
                                ${selectedVipPricing.finalFormatted} ARS hoy
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs">$0 ARS · Sin suscripción mensual</span>
                        )}
                      </div>
                    </div>

                    {/* CARD 3: MENÚ Y CATÁLOGO */}
                    <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                        <span>03 · Menú & Productos</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-slate-700 pt-2">
                        <strong className="text-slate-900 truncate">
                          {data.dishesList.filter((d) => d.name.trim() !== '').length} platos cargados
                        </strong>
                        <span className="text-slate-600">
                          {data.categoriesList.length} categorías definidas ({data.featuredDishIds.length} platos estrella)
                        </span>
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          Estructura y catálogo validados
                        </span>
                      </div>
                    </div>

                    {/* CARD 4: LOGÍSTICA & PAGOS */}
                    <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                        <span>04 · Pedidos & Pagos</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-slate-700 pt-2">
                        <strong className="text-slate-900">{data.whatsappNumber}</strong>
                        <span className="text-slate-600">
                          Alias: {data.paymentCbuAlias} ({data.paymentBank})
                        </span>
                        <span className="text-slate-600 text-[11px]">
                          Efectivo: {data.acceptsCash ? 'Acepta en entrega' : 'Solo transferencias'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BLOQUE DE CONTRATO Y BASES OPERATIVAS */}
                  <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs flex flex-col gap-3.5 sm:gap-4 border border-slate-200/90">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                      <ShieldCheck size={20} className="text-slate-900 shrink-0" />
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          Condiciones del Servicio y Puesta Online del Menú
                        </h4>
                        <p className="text-xs text-slate-600">
                          Bases operativas, alcance técnico y garantía de desarrollo gastronómico.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 text-xs text-slate-600 leading-relaxed">
                      {/* CLÁUSULA 1 */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 flex flex-col md:flex-row md:items-start gap-2.5 md:gap-5">
                        <div className="flex items-center gap-2.5 md:w-[250px] md:shrink-0 pt-0.5">
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">Cómputo del Plazo de Entrega</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed md:flex-1">
                          El plazo de entrega <strong className="text-slate-900 font-semibold">de 24 a 48 hs hábiles</strong> comenzará a computarse una vez enviado este formulario con los datos obligatorios y la lista de precios válida. Nuestro equipo realizará la diagramación y digitalización inicial para que tu Menú quede listo para operar.
                        </p>
                      </div>

                      {/* CLÁUSULA 2 */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 flex flex-col md:flex-row md:items-start gap-2.5 md:gap-5">
                        <div className="flex items-center gap-2.5 md:w-[250px] md:shrink-0 pt-0.5">
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">Propiedad Intelectual y Precios</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed md:flex-1">
                          El cliente declara ser titular o contar con autorización comercial para el uso de las marcas, fotos y nombres de platos cargados. Los precios y descripciones exhibidos son de exclusiva responsabilidad del local gastronómico.
                        </p>
                      </div>

                      {/* CLÁUSULA 3 */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 flex flex-col md:flex-row md:items-start gap-2.5 md:gap-5">
                        <div className="flex items-center gap-2.5 md:w-[250px] md:shrink-0 pt-0.5">
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">Estructura del Menú Inteligente y Hosting SSL</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed md:flex-1">
                          El desarrollo se entrega optimizado para dispositivos móviles, con enlace directo de pedidos a WhatsApp, almacenamiento cloud de alta disponibilidad y certificado de seguridad SSL HTTPS bonificado.
                        </p>
                      </div>

                      {/* CLÁUSULA 4 */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 flex flex-col md:flex-row md:items-start gap-2.5 md:gap-5">
                        <div className="flex items-center gap-2.5 md:w-[250px] md:shrink-0 pt-0.5">
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">4</span>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">Deslinde Técnico y Terceros</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed md:flex-1">
                          El sistema se enlaza con la API y aplicación de WhatsApp y plataformas cloud. AG Digital Studio garantiza la correcta vinculación técnica inicial, deslindando responsabilidad por fallas globales o caídas externas de Meta.
                        </p>
                      </div>

                      {/* CLÁUSULA 5 */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 flex flex-col md:flex-row md:items-start gap-2.5 md:gap-5">
                        <div className="flex items-center gap-2.5 md:w-[250px] md:shrink-0 pt-0.5">
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">5</span>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">Previsualización y Prueba</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed md:flex-1">
                          Finalizada la carga inicial se entregará un enlace privado de prueba para validar que los platos, precios y enlaces a WhatsApp operen a la perfección antes de la difusión al público comensal.
                        </p>
                      </div>

                      {/* CLÁUSULA 6 */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 flex flex-col md:flex-row md:items-start gap-2.5 md:gap-5">
                        <div className="flex items-center gap-2.5 md:w-[250px] md:shrink-0 pt-0.5">
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">6</span>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">Modelo de Gestión y Autonomía</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed md:flex-1">
                          En el Plan Autogestionable se facilita el acceso al panel para autogestionar precios. En el Plan Llave en Mano VIP, el equipo técnico se ocupa de realizar los cambios solicitados por WhatsApp según las condiciones del ciclo contratado.
                        </p>
                      </div>
                    </div>

                    {/* CHECKBOX DE ACEPTACIÓN DESTACADO */}
                    <div className="pt-2">
                      <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/[0.03] border border-slate-300 hover:border-slate-900 transition-all cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={data.acceptedTerms}
                          onChange={(e) => handleInputChange('acceptedTerms', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-slate-900 border-slate-300 focus:ring-0 shrink-0 cursor-pointer"
                        />
                        <div className="text-xs leading-relaxed">
                          <span className="font-bold text-slate-900 block mb-1">
                            He leído y acepto los Términos de Contratación, Propiedad de Contenidos y Alcance Técnico.
                          </span>
                          <p className="text-slate-500">
                            “Declaro que los datos y archivos cargados son definitivos y cuento con los derechos de uso del material suministrado. Autorizo a AG Digital Studio a iniciar la producción técnica bajo las condiciones y plazos estipulados.”
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* RESUMEN DEL MONTO FINAL CALCULADO AL CAMBIO OFICIAL DE HOY */}
                  {data.managementPlan === 'vip' ? (
                    <VipTotalSummaryBanner
                      pricing={selectedVipPricing}
                      dolarFecha={dolarFecha}
                      eyebrowPrefix="Liquidación Final"
                      totalLabel="Total a abonar hoy:"
                    />
                  ) : (
                    <div className="rounded-2xl sm:rounded-3xl bg-emerald-50/70 border border-emerald-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                          Plan Autogestionable Seleccionado
                        </span>
                        <span className="text-xs text-emerald-900/80">
                          Sin suscripción mensual. Al confirmar, pasamos directo a producción.
                        </span>
                      </div>
                      <span className="text-lg sm:text-xl font-black text-emerald-900">Total hoy: $0 ARS</span>
                    </div>
                  )}

                  {/* BOTÓN ENVIAR A PRODUCCIÓN */}
                  <div className="flex flex-col items-center justify-center gap-2.5 pt-1">
                    <AnimatePresence mode="wait">
                      {!data.acceptedTerms ? (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto h-14 px-10 bg-slate-100 text-slate-400 font-semibold rounded-2xl text-sm sm:text-base flex items-center justify-center gap-3 border border-slate-200/80 cursor-not-allowed select-none transition-all"
                        >
                          <ShieldCheck size={18} className="opacity-40" />
                          <span>Aceptá los términos para enviar</span>
                        </button>
                      ) : (
                        <motion.button
                          key="submit-enabled"
                          type="button"
                          initial={{ scale: 0.96, opacity: 0.8 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="relative overflow-hidden w-full sm:w-auto h-14 px-8 sm:px-10 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-2xl text-sm sm:text-base flex items-center justify-center gap-3 cursor-pointer select-none group shadow-lg hover:shadow-xl border border-slate-800 transition-all"
                        >
                          <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                          {isSubmitting ? (
                            <>
                              <Loader2 size={18} className="animate-spin text-white" />
                              <span>Enviando información y sincronizando base de datos...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={18} className="text-white" />
                              <span>Confirmar y Enviar Menú a Producción</span>
                            </>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* BARRA INFERIOR DE ACCIÓN FLOTANTE */}
      {!submittedProject && currentStep.id !== 'WELCOME' && (
        <div className="fixed bottom-0 sm:bottom-5 inset-x-0 z-40 px-2 sm:px-4 py-2 sm:py-3 pointer-events-none flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto w-full max-w-2xl bg-white/95 sm:bg-white/90 backdrop-blur-2xl border-t sm:border border-slate-200/90 sm:rounded-2xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)] sm:shadow-[0_20px_50px_-10px_rgba(15,23,42,0.16),0_0_0_1px_rgba(255,255,255,0.8)_inset] p-2 sm:p-2.5 flex items-center justify-between gap-2 sm:gap-3 transition-all duration-300">
            {/* BOTÓN ANTERIOR (FUNCIONAL EN TODOS LOS PASOS SIN PERDER ESTADO) */}
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStepIndex === 0 && (currentStep.id !== 'CATALOG_SETUP' || catalogSubStep === 0)}
              className={`h-12 sm:h-12.5 px-4 sm:px-5 rounded-xl border font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all ${
                currentStepIndex === 0 && (currentStep.id !== 'CATALOG_SETUP' || catalogSubStep === 0)
                  ? 'opacity-30 border-transparent text-slate-400 cursor-not-allowed'
                  : 'bg-white sm:bg-transparent border-slate-200/80 sm:border-transparent hover:border-slate-300 sm:hover:bg-slate-100 text-slate-700 hover:text-slate-950 active:scale-95 cursor-pointer shadow-2xs sm:shadow-none'
              }`}
              title="Volver atrás"
            >
              <ArrowLeft size={15} />
              <span className="text-xs sm:text-sm font-semibold">Volver</span>
            </button>

            {/* INDICADOR CENTRAL DEL PASO */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Paso {currentStep.stepNumber} de {totalFormSteps}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-slate-800 max-w-[150px] truncate">
                {currentStep.title}
              </span>
            </div>

            {/* BOTÓN CONTINUAR */}
            {currentStep.id !== 'CLOSING_TERMS' && (() => {
              const disabledReason = getDisabledReason();
              const disabled = disabledReason !== null;
              const nextButtonText =
                currentStep.id === 'CATALOG_SETUP'
                  ? catalogSubStep === 0
                    ? 'A Platos'
                    : catalogSubStep === 1
                    ? safeCategoryIndex < data.categoriesList.length - 1
                      ? `Siguiente: ${data.categoriesList[safeCategoryIndex + 1]}`
                      : 'A Destacados'
                    : 'A Logística'
                  : 'Continuar';

              return (
                <div className="flex-1 sm:flex-initial">
                  <AnimatePresence mode="wait">
                    {disabled ? (
                      <motion.button
                        key="btn-disabled"
                        type="button"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        aria-disabled="true"
                        onClick={() => {
                          if (currentStep.id === 'LOGISTICS_WHATSAPP' && !isWhatsappValid) {
                            const input = document.getElementById('logistics-whatsapp-input');
                            input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            input?.focus();
                          }
                        }}
                        className="w-full sm:min-w-[190px] h-12 sm:h-12.5 px-4 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 bg-slate-100 text-slate-500 border border-slate-200/80 cursor-not-allowed select-none transition-all"
                      >
                        <span className="truncate">{disabledReason}</span>
                        <ArrowRight size={15} className="shrink-0 opacity-40" />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="btn-enabled"
                        type="button"
                        initial={{ scale: 0.96, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={nextStep}
                        className="relative overflow-hidden w-full sm:min-w-[190px] h-12 sm:h-12.5 px-4 sm:px-7 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 text-white cursor-pointer select-none group shadow-lg hover:shadow-xl border border-slate-800 transition-all"
                      >
                        <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                        <span className="truncate">{nextButtonText}</span>
                        <ArrowRight size={16} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE DE ASISTENCIA POR WHATSAPP */}
      <FloatingWhatsAppSupport
        currentStepTitle={currentStep?.title}
        restaurantName={data.restaurantName}
        stepNumber={currentStep?.stepNumber > 0 ? currentStep.stepNumber : undefined}
      />
    </div>
  );
}
