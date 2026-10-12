<template>
  <router-link class="lot" :to="{name:'SingleItem',params:{id:item.item_id}}">
    <div class="art"><img v-if="image" :src="image" :alt="item.name" loading="lazy"/><span v-else class="no-image">{{ $t('No photo', '暂无图片') }}</span></div>
    <div class="caption"><h3>{{item.name}}</h3><strong>£{{currentBid}}</strong></div>
  </router-link>
</template>
<script>
export default{name:'ItemCard',props:{item:{type:Object,required:true},index:{type:Number,default:0}},computed:{image(){return this.item.image_url||''},currentBid(){return this.item.current_bid??this.item.starting_bid??0}},methods:{open(){this.$router.push({name:'SingleItem',params:{id:this.item.item_id}})}}}
</script>
<style scoped>
.lot {
  display: block;
  min-width: 0;
  transition: transform 180ms ease;
}

.art {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid #d8dde6;
  border-radius: var(--radius);
  background:
    radial-gradient(circle at 14px 14px, rgba(23,35,59,.055) 0 4px, transparent 4.5px) 0 0 / 28px 28px,
    var(--surface);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.art img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 20px;
  object-fit: contain;
}

.lot:hover .art {
  transform: translateY(-5px);
  border-color: #aeb7c5;
  box-shadow: 0 16px 28px rgba(31,48,75,.14);
}

.lot:active { transform: scale(.985); }

.no-image {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 0.78rem;
}

.caption {
  padding: 13px 2px 0;
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 10px;
}

.caption h3 {
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 680;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.caption strong {
  flex: 0 0 auto;
  color: var(--ink);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.4;
}
</style>
