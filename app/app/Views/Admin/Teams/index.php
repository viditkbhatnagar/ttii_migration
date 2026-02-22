
    <div class="row">
        <div class="col-12">
            <div class="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 class="mb-sm-0">Teams</h4>

                <div class="page-title-right">
                    <ol class="breadcrumb m-0">
                        <li class="breadcrumb-item"><a href="javascript: void(0);">Settings</a></li>
                        <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                    </ol>
                </div>

            </div>
        </div>
    </div>
    <!-- end page title -->

    <div class="card">
        <div class="card-body">
            <div class="row g-2">
                <div class="col-sm-4">
                    <div class="search-box">
                        <input type="text" class="form-control" id="searchMemberList"
                               placeholder="Search for team...">
                        <i class="ri-search-line search-icon"></i>
                    </div>
                </div>
                <!--end col-->
                <div class="col-sm-auto ms-auto">
                    <div class="list-grid-nav hstack gap-1">
                        <button class="btn btn-success addMembers-modal"
                                onclick="show_small_modal('<?=base_url('app/teams/ajax_add/')?>', 'Add <?=$page_title ?? ''?>')">
                            <i class="ri-add-fill me-1 align-bottom"></i>
                            Create <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>
                <!--end col-->
            </div>
            <!--end row-->
        </div>
    </div>

    <div class="row">
        <div class="col-lg-12">
            <div>

                <div id="teamlist">
                    <div class="team-list list-view-filter row" id="team-member-list">
                        
                        <?php foreach($list_items as $item){ ?>
                            <div class="col">
                                <div class="card team-box">
                                    <div class="card-body p-4">
                                        <div class="row align-items-center team-row">
                                            <div class="col team-settings">
                                                <div class="row">
                                                    <div class="col text-end dropdown">
                                                        <a href="javascript:void(0);" data-bs-toggle="dropdown" aria-expanded="false">
                                                            <i class="ri-more-fill fs-17"></i>
                                                        </a>
                                                        <ul class="dropdown-menu dropdown-menu-end">
                                                            <li><a class="dropdown-item edit-list" href="javascript:void(0);" data-bs-toggle="modal" onclick="show_small_modal('<?=base_url('app/teams/ajax_edit/'.$item['id'])?>', 'Update Team')"><i class="ri-pencil-line me-2 align-bottom text-muted"></i>Edit</a></li>
                                                            <li><a class="dropdown-item remove-list" href="javascript:void(0);" data-bs-toggle="modal" onclick="delete_modal('<?=base_url('app/teams/delete/'.$item['id'])?>')"><i class="ri-delete-bin-5-line me-2 align-bottom text-muted"></i>Remove</a></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-lg-4 col">
                                                <div class="team-profile-img">
                                                    <div class="avatar-md rounded-circle h-auto">
                                                    <?php if(valid_file($item['image'])){ ?>
                                                            <img src="<?=base_url(get_file($item['image']))?>" class="avatar-md rounded-circle h-auto" />
                                                    <?php }else{ ?>
                                                            <img src="<?=base_url()?>assets/app/images/place-holder/placeholder-image.png" class="avatar-md rounded-circle h-auto" />
                                                    <?php } ?>
                                                    </div>
                                                    <div class="team-content">
                                                        <a class="member-name" data-bs-toggle="offcanvas" href="javascript:void(0);" aria-controls="member-overview" onclick="show_small_modal('<?=base_url('app/teams/ajax_view/'.$item['id'])?>', 'View Team')">
                                                            <h5 class="fs-16 mb-1"><?=$item['title']?></h5>
                                                        </a>
                                                        <p class="text-muted member-designation mb-0"><?=$item['description']?></p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-lg-3 col">
                                                <div class="team-profile-img">
                                                    <div class="team-content">
                                                        <?php 
                                                        if(!empty($item['Team_leaders'])){ ?>
                                                        
                                                         <p class="text-muted member-designation mb-0" style="font-weight:bold;">Team Leaders Name</p>
                                                            <?php
                                                            foreach($item['Team_leaders'] as $Team_leader){ ?>
                                                                <span class="text-muted member-designation mb-0"><?=$Team_leader['name']?>,</span>
                                                            <?php }
                                                        }
                                                        ?>
                                                        </div>
                                                    </div>
                                                
                                                </div>
                                            <div class="col-lg-2 col">
                                                <div class="text-end">
                                                    <a href="<?=base_url('app/employees/index/'.$item['id'])?>" class="btn btn-light view-btn view_team_members_btn">View Members ( <?=$item['member_count']?> )</a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php } ?>

                    </div>
                </div>
                <div class="py-4 mt-4 text-center" id="noresult" style="display: none;">
                    <lord-icon src="https://cdn.lordicon.com/msoeawqm.json" trigger="loop"
                               colors="primary:#405189,secondary:#0ab39c" style="width:72px;height:72px"></lord-icon>
                    <h5 class="mt-4">Sorry! No Result Found</h5>
                </div>
            </div>
        </div><!-- end col -->
    </div>
        <!--end row-->

    </div><!-- container-fluid -->
</div><!-- End Page-content -->

<style>
    .view_team_members_btn{
        width: 200px; !important;
    }
</style>

<script>

    var searchMemberList = document.getElementById("searchMemberList");
    searchMemberList.addEventListener("keyup", function () {
        var inputVal = searchMemberList.value.toLowerCase();
        
        // Select all team boxes
        var teamBoxes = document.querySelectorAll("#team-member-list .card.team-box");
        
        // Variable to check if any item is found
        var anyItemFound = false;
        
        teamBoxes.forEach(function (teamBox) {
            // Get the content of the team box
            var teamBoxContent = teamBox.textContent.toLowerCase();
            
            // Check if the content includes the search input
            if (teamBoxContent.includes(inputVal)) {
                teamBox.style.display = ""; // Show the team box
                anyItemFound = true;
            } else {
                teamBox.style.display = "none"; // Hide the team box
            }
        });
        
        // Show or hide the 'no results' message based on search results
        if (anyItemFound) {
            document.getElementById("noresult").style.display = "none";
            document.getElementById("team-member-list").style.display = "block";
        } else {
            document.getElementById("noresult").style.display = "block";
            document.getElementById("team-member-list").style.display = "none";
        }
    });


</script>
