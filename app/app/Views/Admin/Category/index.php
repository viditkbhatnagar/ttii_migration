<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>

<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-6">
                       <div class="col-sm-4 ps-3 pt-4 d-none">
                            <div class="search-box">
                                <input type="text" class="form-control" id="searchMemberList" placeholder="Search Category...">
                                <i class="ri-search-line search-icon"></i>
                            </div>
                        </div>
                       
                    </div>
                    <div class="col-6">
                        <button class="btn btn-primary rounded-pill float-end" onclick="show_ajax_modal('<?=base_url('admin/category/ajax_add/')?>', 'Add <?=$page_title ?? ''?>')">
                            <i class="mdi mdi-plus"></i>
                            Create <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>


<div class="row d-none">
    <div class="col-lg-12">
        <div class="">
            <div class="card-body">
                <div class="row">
                    <div class="col-lg-12">
                        <div class="row gallery-wrapper">
                            <?php 
                                if (isset($list_items)){
                                foreach ($list_items as $key => $list_item){ 
                            ?>
                            <div class="element-item col-xxl-3 col-xl-4 col-sm-6 project designing development" data-category="designing development">
                                <div class="gallery-box card">
                                    <div class="gallery-container">
                                        <?php
                                        if(!empty($list_item['thumbnail']))
                                        { ?>
                                            <a class="image-popup" href="<?= base_url(get_file($list_item['thumbnail'])) ?>" data-lightbox="image-group" style="height: 250px;width:auto;" title="">
                                                <img class="gallery-img img-fluid mx-auto" src="<?= base_url(get_file($list_item['thumbnail'])) ?>" style="width:100%;height:100%;" alt="" />
                                               
                                            </a>
                                        <?php
                                        }
                                        else
                                        {?>
                                        
                                            <a class="image-popup" href="<?=base_url('uploads/dummy.webp')?>" data-lightbox="image-group" style="height: 250px;width:auto;" title="">
                                                <img class="gallery-img img-fluid mx-auto" src="<?=base_url('uploads/dummy.webp')?>" style="width:100%;height:100%;" alt="" />
                                               
                                            </a>
                                        
                                        
                                        <?php
                                        }
                                        ?>
                                    </div>
                                    <ul class="list-group list-group-flush">
                                                <li class="list-group-item"><i class="<?= $list_item['font_awesome_class'] ?>"></i>&nbsp;<b><?= $list_item['name'] ?></b>
                                                    <?//php if(!empty($list_item['sub_cats'])){ echo '<br class="d-non><small style="font-style: italic;">'.sizeof($list_item['sub_cats'])." Sub Categories</small>";   }  ?>
                                                </li>
                                                <?php
                                                if(!empty($list_item['sub_cats']))
                                                {
                                                    foreach($list_item['sub_cats'] as $v){
                                                ?>
                                                    <li class="list-group-item d-none"><?=$v['name']?> 
                                                            
                                                                
                                                                <a href="javascript::void()" style="float: right;" class="remove-item-btn" onclick="delete_modal('<?=base_url('admin/category/delete/'.$v['id'])?>')">
                                                                    <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> 
                                                                </a>
                                                                <a href="javascript::void()" style="float: right;" class="btn btn-info btn-sm ml-1" onclick="show_ajax_modal('<?=base_url('admin/category/ajax_edit/'.$v['id'])?>', 'Update Category')">
                                                                    <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> 
                                                                </a>
                                                    </li>
                                                <?php   
                                                    }
                                                }
                                                ?>
                                        <li class="list-group-item">
                                             <div class=" box-content">
                                                <div class="d-flex align-items-center mt-1">
                                                    <div class="flex-shrink-0 pt-3">
                                                        <div class="d-flex gap-3">
                                                            <button type="button" class="btn btn-info btn-sm ml-1" onclick="show_ajax_modal('<?=base_url('admin/category/ajax_edit/'.$list_item['id'])?>', 'Update <?=$page_title ?? ''?>')">
                                                                <i class="ri-pencil-fill align-bottom me-2" ></i> Edit
                                                            </button>
                                                            <button type="button" class="btn btn-outline-danger btn-sm" onclick="delete_modal('<?=base_url('admin/category/delete/'.$list_item['id'])?>')">
                                                                <i class="ri-delete-bin-fill align-bottom me-2"></i> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>

                                    </ul>

                                   
                                </div>
                            </div>
                            <?php } } ?>
                            <!-- end col -->
                        </div>
                        <!-- end row -->
                    </div>
                </div>
                <!-- end row -->
            </div>
            <!-- ene card body -->
        </div>
        <!-- end card -->
    </div>
    <!-- end col -->
</div>
<div class="row">
    <div class="col-lg-12">
        <div class="">
            <div class="card-body">
                <div class="row">
                    <div class="col-lg-12">
                        <div class="row gallery-wrapper">
                            <?php 
                                if (isset($list_items)){
                                foreach ($list_items as $key => $list_item){ 
                            ?>
                            <div class="element-item col-xxl-3 col-xl-4 col-sm-6 project designing development" data-category="designing development">
                                <div class="card hover-card-srs srs-border-radius p-2">
                                    <?php
                                    if (!empty($list_item['thumbnail'])) {
                                    ?>
                                        <a class="image-popup" href="<?= base_url(get_file($list_item['thumbnail'])) ?>" data-lightbox="image-group">
                                            <div class="card-img-wrapper-srs">
                                                <img class="card card-img img-fluid" src="<?= base_url(get_file($list_item['thumbnail'])) ?>" alt="Card image cap">
                                            </div>
                                        </a>
                                    <?php
                                    } else {
                                    ?>
                                        <a class="image-popup" href="<?= base_url('uploads/dummy.webp') ?>" data-lightbox="image-group">
                                            <div class="card-img-wrapper-srs">
                                                <img class="card card-img img-fluid" src="<?= base_url('uploads/dummy.webp') ?>" alt="Card image cap">
                                            </div>
                                        </a>
                                    <?php
                                    }
                                    ?>
                                    <div class="card-body px-2 pb-3">
                                        <h4 class="card-title mb-3"><?= $list_item['name'] ?></h4>
                                        <div class="d-flex align-items-center justify-content-between">
                                            <button type="button" onclick="show_ajax_modal('<?=base_url('admin/category/ajax_edit/'.$list_item['id'])?>', 'Update <?=$page_title ?? ''?>')" class="btn btn-outline-primary btn-sm w-50 p-2 rounded-pill hover-btn me-3 srs-fs" onclick="show_ajax_modal('<?= base_url('admin/category/ajax_edit/'.$list_item['id']) ?>', 'Update <?= $page_title ?? '' ?>')">
                                                <i class="ri-pencil-fill align-bottom"></i> Edit
                                            </button>
                                            <button type="button" onclick="delete_modal('<?=base_url('admin/category/delete/'.$list_item['id'])?>')" class="btn btn-outline-danger btn-sm w-50 p-2 rounded-pill hover-btn srs-fs" onclick="delete_modal('<?= base_url('admin/category/delete/'.$list_item['id']) ?>')">
                                                <i class="ri-delete-bin-fill align-bottom"></i> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <?php } } ?>
                            <!-- end col -->
                        </div>
                        <!-- end row -->
                    </div>
                </div>
                <!-- end row -->
            </div>
            <!-- ene card body -->
        </div>
        <!-- end card -->
    </div>
    <!-- end col -->
</div>

      <style>
          .hover-card-srs {
    transition: transform .2s; /* Animation */
}

.hover-card-srs:hover {
    transform: scale(1.05); /* (150% zoom - Note: if the zoom is too large, it will go outside of the viewport) */
}
.card-img-wrapper-srs img {
    position: absolute;
    object-fit: contain; /* to maintain aspect ratio of the image */
    width: 100%;
    height: 100%;
    transition: transform .3s ease-in-out; /* Add transition property */
}

.hover-card-srs:hover .card-img-wrapper-srs img {
    transform: scale(1.1); /* Add transform property on hover */
}
.card-img-wrapper-srs {
    position: relative;
    width: 100%;
    padding-bottom: 100%; /* for aspect ratio 1:1 */
    min-height: 200px; /* for minimum height */
    overflow: hidden;
    background-color: #efefef;
}

.card-img-wrapper-srs img {
    position: absolute;
    object-fit:cover; /* to maintain aspect ratio of the image */
    width: 100%;
    height: 100%;
}

      .srs-border-radius{
        border-radius: 10px;
      }

      .srs-fs{
        font-size: 0.8rem;
      }
      </style>
<script>

   document.addEventListener('DOMContentLoaded', function () {
    var searchMemberList = document.getElementById("searchMemberList");
    var teamBoxes = document.querySelectorAll(".gallery-box");
    var initialTeamListHTML = document.querySelector(".gallery-container").innerHTML;

    searchMemberList.addEventListener("input", function () {
        var inputVal = searchMemberList.value.trim().toLowerCase();

        teamBoxes.forEach(function (teamBox) {
            var teamBoxContent = teamBox.textContent.toLowerCase();
            var parentElement = teamBox.closest('.col-4'); // Assuming each team member container has the class 'col-4'

            if (teamBoxContent.includes(inputVal)) {
                parentElement.style.display = ""; // Show the team member container
            } else {
                parentElement.style.display = "none"; // Hide the team member container
            }
        });

        var anyResults = [...document.querySelectorAll('.col-4')].some(function (element) {
            return element.style.display !== "none";
        });

        if (!anyResults) {
            document.getElementById('noresult').style.display = "block";
        } else {
            document.getElementById('noresult').style.display = "none";
        }
    });
});

</script>


