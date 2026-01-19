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
  'form.update': string
  'form.error.allFields': string
  'form.error.validPrice': string
  'form.error.validQuantity': string
  'form.image': string
  'form.optional': string
  'form.or': string
  'form.imageUrlPlaceholder': string
  'form.error.imageTooLarge': string
  'form.error.invalidImageUrl': string
  'table.title': string
  'table.image': string
  'table.productId': string
  'table.name': string
  'table.price': string
  'table.quantity': string
  'table.totalValue': string
  'table.actions': string
  'table.remove': string
  'table.edit': string
  'modal.editProduct': string
  'modal.save': string
  'modal.cancel': string
  'search.placeholder': string
  'search.noResults': string
  'empty.noProducts': string
  'columns.manage': string
  'columns.title': string
  'columns.visible': string
  'columns.hidden': string
  'columns.custom': string
  'columns.addCustom': string
  'columns.labelPlaceholder': string
  'columns.type': string
  'columns.add': string
  'columns.remove': string
  'columns.formula': string
  'columns.formulaPlaceholder': string
  'columns.availableColumns': string
  'columns.formulaHelp': string
  'columns.error.labelRequired': string
  'columns.error.duplicate': string
  'columns.error.formulaRequired': string
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
    'form.update': 'Update Product',
    'form.error.allFields': 'Please fill in all fields',
    'form.error.validPrice': 'Please enter a valid price',
    'form.error.validQuantity': 'Please enter a valid quantity',
    'form.image': 'Product Image',
    'form.optional': 'Optional',
    'form.or': 'or',
    'form.imageUrlPlaceholder': 'Paste image URL',
    'form.error.imageTooLarge': 'Image size must be less than 5MB',
    'form.error.invalidImageUrl': 'Invalid image URL',
    'table.title': 'Products',
    'table.image': 'Image',
    'table.productId': 'Product ID',
    'table.name': 'Name',
    'table.price': 'Price',
    'table.quantity': 'Quantity',
    'table.totalValue': 'Total Value',
    'table.actions': 'Actions',
    'table.remove': 'Remove',
    'table.edit': 'Edit',
    'modal.editProduct': 'Edit Product',
    'modal.save': 'Save',
    'modal.cancel': 'Cancel',
    'search.placeholder': 'Search by Product ID...',
    'search.noResults': 'No products found matching "{term}"',
    'empty.noProducts': 'No products added yet. Add your first product!',
    'columns.manage': 'Manage Columns',
    'columns.title': 'Column Settings',
    'columns.visible': 'Visible Columns',
    'columns.hidden': 'Hidden Columns',
    'columns.custom': '(custom)',
    'columns.addCustom': 'Add Custom Column',
    'columns.labelPlaceholder': "Column name (e.g., 'Category', 'Brand', 'SKU')",
    'columns.type': 'Type',
    'columns.add': 'Add Column',
    'columns.remove': 'Remove column',
    'columns.formula': 'Formula (Calculated)',
    'columns.formulaPlaceholder': 'e.g., price * quantity, (price - discount) * quantity',
    'columns.availableColumns': 'Available columns:',
    'columns.formulaHelp': 'Use: +, -, *, /, (, ). Example: price * quantity',
    'columns.error.labelRequired': 'Please enter a column name',
    'columns.error.duplicate': 'A column with this name already exists',
    'columns.error.formulaRequired': 'Please enter a formula expression',
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
    'form.update': '更新产品',
    'form.error.allFields': '请填写所有字段',
    'form.error.validPrice': '请输入有效价格',
    'form.error.validQuantity': '请输入有效数量',
    'form.image': '产品图片',
    'form.optional': '可选',
    'form.or': '或',
    'form.imageUrlPlaceholder': '粘贴图片链接',
    'form.error.imageTooLarge': '图片大小必须小于5MB',
    'form.error.invalidImageUrl': '无效的图片链接',
    'table.title': '产品',
    'table.image': '图片',
    'table.productId': '产品ID',
    'table.name': '名称',
    'table.price': '价格',
    'table.quantity': '数量',
    'table.totalValue': '总价值',
    'table.actions': '操作',
    'table.remove': '删除',
    'table.edit': '编辑',
    'modal.editProduct': '编辑产品',
    'modal.save': '保存',
    'modal.cancel': '取消',
    'search.placeholder': '按产品ID搜索...',
    'search.noResults': '未找到匹配 "{term}" 的产品',
    'empty.noProducts': '尚未添加产品。添加您的第一个产品！',
    'columns.manage': '管理列',
    'columns.title': '列设置',
    'columns.visible': '可见列',
    'columns.hidden': '隐藏列',
    'columns.custom': '（自定义）',
    'columns.addCustom': '添加自定义列',
    'columns.labelPlaceholder': "列名称（例如：'类别'、'品牌'、'SKU'）",
    'columns.type': '类型',
    'columns.add': '添加列',
    'columns.remove': '删除列',
    'columns.formula': '公式（计算）',
    'columns.formulaPlaceholder': '例如：price * quantity, (price - discount) * quantity',
    'columns.availableColumns': '可用列：',
    'columns.formulaHelp': '使用：+, -, *, /, (, )。示例：price * quantity',
    'columns.error.labelRequired': '请输入列名称',
    'columns.error.duplicate': '已存在具有此名称的列',
    'columns.error.formulaRequired': '请输入公式表达式',
  },
}

export function getTranslation(key: keyof Translations | string, lang: Language): string {
  const translationKey = key as keyof Translations
  const translation = translations[lang]?.[translationKey]
  return translation || translations.en[translationKey] || String(key)
}
