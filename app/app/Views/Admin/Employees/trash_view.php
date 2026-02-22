<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="javascript: void(0);">Dashboard</a></li>
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
            
            <div class="col-6">
                <div class="search-box">
                    <input type="text" class="form-control" id="searchMemberList"
                           placeholder="Search for employees...">
                    <i class="ri-search-line search-icon"></i>
                </div>
            </div>
            <div class="col-6 text-right">
               
            </div>
            
            
         
            <!--end col-->
        </div>
        <!--end row-->
    </div>
</div>

<div class="row mb-4">
    <div class="col-lg-12">
        <div>
            <?php if (isset($list_items)){ ?>
                <div id="teamlist">
                    <div class="team-list list-view-filter row" id="team-member-list">
                        <div class="col">
                            <?php foreach($list_items as $item){ ?>
                                <div class="card team-box">
                                    <div class="card-body p-3">
                                        <div class="row align-items-center team-row">
                                           
                                            <div class="col-lg-3 col">
                                                <div class="team-profile-img">
                                                    <div class="avatar-sm rounded-circle h-auto">
                                                        <?php if(valid_file($item['profile_picture'])){ ?>
                                                                <img src="<?=base_url(get_file($item['profile_picture']));?>" class="avatar-sm rounded-circle" />
                                                        <?php }else{ ?>
                                                                <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" class="avatar-sm rounded-circle" />
                                                        <?php } ?>
                                                    </div>
                                                    <div class="team-content">
                                                        <a class="member-name" href="javascript:void(0);" onclick="canvas_right('<?=base_url('app/employees/ajax_view/'.$item['id'])?>', 'Employee Details')">
                                                            <h5 class="fs-16 mb-1"><?=$item['name']?></h5>
                                                            <p class="text-muted member-code mb-0"><?=$item['employee_code']?></p>
                                                            <p class="text-muted member-designation mb-0"><?= !empty($designation[$item['user_designation_id']]) ? ($designation[$item['user_designation_id']] ?? '') : ''?></p>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-lg-3 col">
                                                <div class="text-start">
                                                    <p class="text-muted member-designation mb-0"><i class="ri-phone-line"></i> <?=$item['phone']?></p>
                                                    <p class="text-muted member-designation mb-0"><i class="ri-mail-line"></i> <?=$item['email']?></p>
                                                </div>
                                            </div>
                                            <div class="col-lg-2 col">
                                                <div class="text-start">
                                                    <span style="color: #9e9e9e;font-size: 10px;"><i class="ri-team-line"></i> Team</span><br>
                                                    <b class="text-muted"><?= !empty($team_members[$item['id']]) ? ($teams[$team_members[$item['id']]] ?? 'No Team') : 'No Team'?></b>
                                                </div>
                                            </div>
                                            <div class="col-lg-2 col">
                                                <div class="text-center">
                                                    <span style="color: #9e9e9e;font-size: 10px;"> Role</span><br>
                                                    <span class="badge bg-secondary-subtle text-secondary badge-border"><?=$roles[$item['role_id']]?></span>
                                                </div>
                                            </div>
                                             <div class="col-lg-2 col">
                                                <div class="row">
                                                     <div class="col-lg-6">
                                                        <div class=" d-flex justify-content-end">
                                                            <a class="btn btn-success btn-sm" href="javascript:void(0);" data-bs-toggle="modal" onclick="restore_modal('<?=base_url('app/employees/restore/'.$item['id'])?>')"><i class="ri-reply-fill"></i> Restore</a>
                                                        </div>
                                                    </div>
                                                    <div class="col-lg-6">
                                                        <div class=" d-flex justify-content-end">
                                                            <a class="btn btn-danger btn-sm" href="javascript:void(0);" data-bs-toggle="modal" onclick="delete_modal('<?=base_url('app/employees/delete_permenant/'.$item['id'])?>')"><i class="ri-delete-bin-fill"></i> Delete Permenently</a>
                                                        </div>
                                                    </div>
                                                   
                                                  

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            <?php } ?>
                        </div>

                    </div>
                </div>
                <div class="py-4 mt-4 text-center" id="noresult" style="display: none;">
                    <lord-icon src="https://cdn.lordicon.com/msoeawqm.json" trigger="loop"
                               colors="primary:#405189,secondary:#0ab39c" style="width:72px;height:72px"></lord-icon>
                    <h5 class="mt-4">Sorry! No Result Found</h5>
                </div>
            <?php }else{ ?>
                <div class="py-4 mt-4 text-center" >
                    <lord-icon src="https://cdn.lordicon.com/msoeawqm.json" trigger="loop"
                               colors="primary:#405189,secondary:#0ab39c" style="width:72px;height:72px"></lord-icon>
                    <h5 class="mt-4">Sorry! No Result Found</h5>
                </div>
            <?php } ?>
        </div>
    </div><!-- end col -->
</div>
<!--end row-->


<style>
    .view_team_members_btn{
        width: 200px; !important;
    }
    .card_active{
        border:2px solid #405189!important;
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



