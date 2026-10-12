<template>

<h1>
Item Detail
</h1>


<h2>
{{item.name}}
</h2>


<p>
Price: £{{item.price}}
</p>


<button>
Place Bid
</button>


</template>



<script>

export default{

data(){

return{

item:{

name:"iPhone 15",
price:500

}

}

}

}

</script>