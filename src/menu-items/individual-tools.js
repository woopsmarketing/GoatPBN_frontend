/**
 * 🔧 개별 기능 도구 메뉴 아이템
 * 각종 개별 기능들을 테스트할 수 있는 메뉴 구성
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

// ==============================|| 개별 기능 도구 메뉴 ||============================== //

const individualTools = {
  id: 'group-individual-tools',
  title: 'individual-tools',
  type: 'group',
  children: [
    {
      id: 'keyword-generator',
      title: 'keyword-generator',
      type: 'item',
      url: '/tools/keyword-generator',
      icon: icons.keyword,
      breadcrumbs: false
    },
    {
      id: 'content-generator',
      title: 'content-generator',
      type: 'item',
      url: '/tools/content-generator',
      icon: icons.content,
      breadcrumbs: false
    },
    {
      id: 'image-generator',
      title: 'image-generator',
      type: 'item',
      url: '/tools/image-generator',
      icon: icons.image,
      breadcrumbs: false
    },
    {
      id: 'link-builder',
      title: 'link-builder',
      type: 'item',
      url: '/tools/link-builder',
      icon: icons.link,
      breadcrumbs: false
    },
    {
      id: 'seo-analyzer',
      title: 'seo-analyzer',
      type: 'item',
      url: '/tools/seo-analyzer',
      icon: icons.search,
      breadcrumbs: false
    }
  ]
};

export default individualTools;
