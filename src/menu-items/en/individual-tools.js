/**
 * 🔧 개별 기능 도구 메뉴 아이템 (EN)
 * 목적: 영문 전용 툴링 메뉴 구성
 */

// assets - 아이콘 import
import { Setting2, Tag, DocumentText, Image, Link, SearchNormal1 } from '@wandersonalwes/iconsax-react';

// 아이콘 매핑
const icons = {
  tools: Setting2,
  keyword: Tag,
  content: DocumentText,
  image: Image,
  link: Link,
  search: SearchNormal1
};

// ==============================|| INDIVIDUAL TOOLS MENU (EN) ||============================== //

const individualToolsEn = {
  id: 'group-individual-tools-en',
  title: 'individual-tools',
  type: 'group',
  children: [
    {
      id: 'keyword-generator-en',
      title: 'keyword-generator',
      type: 'item',
      url: '/en/tools/keyword-generator',
      icon: icons.keyword,
      breadcrumbs: false
    },
    {
      id: 'content-generator-en',
      title: 'content-generator',
      type: 'item',
      url: '/en/tools/content-generator',
      icon: icons.content,
      breadcrumbs: false
    },
    {
      id: 'image-generator-en',
      title: 'image-generator',
      type: 'item',
      url: '/en/tools/image-generator',
      icon: icons.image,
      breadcrumbs: false
    },
    {
      id: 'link-builder-en',
      title: 'link-builder',
      type: 'item',
      url: '/en/tools/link-builder',
      icon: icons.link,
      breadcrumbs: false
    },
    {
      id: 'seo-analyzer-en',
      title: 'seo-analyzer',
      type: 'item',
      url: '/en/tools/seo-analyzer',
      icon: icons.search,
      breadcrumbs: false
    }
  ]
};

export default individualToolsEn;

