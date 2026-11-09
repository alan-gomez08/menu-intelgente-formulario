export interface DishItem {
  id: string;
  categoryName: string;
  name: string;
  price: string;
  description?: string;
  imageUrl?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  cost: string;
}

export type ManagementPlan = 'autogestionable' | 'vip';
export type BillingCycle = 'mensual' | 'trimestral' | 'semestral' | 'anual';
export type ThemeTone = 'light' | 'dark';

export interface MenuFormData {
  // PASO 1: Validación de Compra
  mercadoLibreUser: string;

  // PASO 2: Identidad del Local
  restaurantName: string;

  // PASO 3: Carga de Logotipo
  logoUrl: string;
  noLogo: boolean;

  // PASO 4: Estilo Visual
  primaryColor: string;
  themeTone: ThemeTone;

  // PASO 5: Elección de Plan de Gestión
  managementPlan: ManagementPlan;
  billingCycle: BillingCycle;

  // PASO 6: Creador de Catálogo (Lógica Iterativa)
  categoriesList: string[];
  dishesList: DishItem[];
  featuredDishIds: string[];

  // PASO 7: Logística y Envíos (Solo Delivery y Retiro por Local)
  whatsappNumber: string;
  deliveryMethods: {
    delivery: boolean;
    takeaway: boolean;
  };
  deliveryZones: DeliveryZone[];

  // PASO 8: Medios de Cobro (Checkout)
  paymentCbuAlias: string;
  paymentAccountHolder: string;
  paymentBank: string;
  acceptsCash: boolean;

  // PASO 9: Pantalla de cierre y términos
  acceptedTerms: boolean;

  // Campos heredados opcionales para retrocompatibilidad
  heroSlogan?: string;
  heroImageUrl?: string;
  menuFileUrl?: string;
  menuFileName?: string;
}

export type StepId =
  | 'WELCOME'
  | 'PURCHASE_VALIDATION'
  | 'RESTAURANT_IDENTITY'
  | 'LOGO_UPLOAD'
  | 'VISUAL_STYLE'
  | 'MANAGEMENT_PLAN'
  | 'CATALOG_SETUP'
  | 'LOGISTICS_WHATSAPP'
  | 'PAYMENT_METHODS'
  | 'CLOSING_TERMS';

export interface StepDefinition {
  id: StepId;
  stepNumber: number;
  title: string;
  shortTitle: string;
  category: string;
}
