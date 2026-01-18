export type Language = 'en' | 'zh'

interface Translations {
  'app.title': string
  'nav.signOut': string
  'signin.title': string
  'signin.subtitle': string
  'signin.button': string
  'loading': string
  'form.title': string
  'form.productName': string
  'form.productNamePlaceholder': string
  'form.productId': string
  'form.productIdPlaceholder': string
  'form.price': string
  'form.quantity': string
  'form.submit': string
  'form.error.allFields': string
  'form.error.validPrice': string
  'form.error.validQuantity': string
  'table.title': string
  'table.productId': string
  'table.name': string
  'table.price': string
  'table.quantity': string
  'table.totalValue': string
  'table.actions': string
  'table.remove': string
  'search.placeholder': string
  'search.noResults': string
  'empty.noProducts': string
}

export const translations: Record<Language, Translations> = {
  en: {
    'app.title': 'Ecommerce Dashboard',
    'nav.signOut': 'Sign Out',
    'signin.title': 'Ecommerce Dashboard',
    'signin.subtitle': 'Sign in to manage your products',
    'signin.button': 'Sign in with Google',
    'loading': 'Loading...',
    'form.title': 'Add New Product',
    'form.productName': 'Product Name',
    'form.productNamePlaceholder': 'Enter product name',
    'form.productId': 'Product ID',
    'form.productIdPlaceholder': 'Enter product ID',
    'form.price': 'Price',
    'form.quantity': 'Quantity',
    'form.submit': 'Add Product',
    'form.error.allFields': 'Please fill in all fields',
    'form.error.validPrice': 'Please enter a valid price',
    'form.error.validQuantity': 'Please enter a valid quantity',
    'table.title': 'Products',
    'table.productId': 'Product ID',
    'table.name': 'Name',
    'table.price': 'Price',
    'table.quantity': 'Quantity',
    'table.totalValue': 'Total Value',
    'table.actions': 'Actions',
    'table.remove': 'Remove',
    'search.placeholder': 'Search by Product ID...',
    'search.noResults': 'No products found matching "{term}"',
    'empty.noProducts': 'No products added yet. Add your first product!',
  },
  zh: {
    'app.title': '电商仪表板',
    'nav.signOut': '退出',
    'signin.title': '电商仪表板',
    'signin.subtitle': '登录以管理您的产品',
    'signin.button': '使用 Google 登录',
    'loading': '加载中...',
    'form.title': '添加新产品',
    'form.productName': '产品名称',
    'form.productNamePlaceholder': '输入产品名称',
    'form.productId': '产品ID',
    'form.productIdPlaceholder': '输入产品ID',
    'form.price': '价格',
    'form.quantity': '数量',
    'form.submit': '添加产品',
    'form.error.allFields': '请填写所有字段',
    'form.error.validPrice': '请输入有效价格',
    'form.error.validQuantity': '请输入有效数量',
    'table.title': '产品',
    'table.productId': '产品ID',
    'table.name': '名称',
    'table.price': '价格',
    'table.quantity': '数量',
    'table.totalValue': '总价值',
    'table.actions': '操作',
    'table.remove': '删除',
    'search.placeholder': '按产品ID搜索...',
    'search.noResults': '未找到匹配 "{term}" 的产品',
    'empty.noProducts': '尚未添加产品。添加您的第一个产品！',
  },
}

export function getTranslation(key: keyof Translations, lang: Language): string {
  const translation = translations[lang]?.[key]
  return translation || translations.en[key] || key
}
