<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? 'Resources'?></h4>
            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('centre/resources')?>">Resources</a></li>
                    <?php if ($current_folder): ?>
                        <li class="breadcrumb-item active"><?=esc($current_folder['name'])?></li>
                    <?php endif; ?>
                </ol>
            </div>
        </div>
    </div>
</div>

<div class="file-manager-content w-100 p-3 py-0">
    <div class="mx-n3 pt-4 px-4 file-manager-content-scroll" data-simplebar>
        <div id="folder-list" class="mb-2">
            <div class="row justify-content-between g-2 mb-3">
                <div class="col">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0 me-2 d-block d-lg-none">
                            <button type="button" class="btn btn-soft-success btn-icon btn-sm fs-16 file-menu-btn">
                                <i class="ri-menu-2-fill align-bottom"></i>
                            </button>
                        </div>
                        <div class="flex-grow-1">
                            <h5 class="fs-16 mb-0">Folders and Files</h5>
                        </div>
                    </div>
                </div>
                <div class="col-auto">
                    <div class="d-flex gap-2 align-items-start">
                        <select class="form-control" data-choices data-choices-search-false name="choices-single-default" id="file-type">
                            <option value="All" selected>All</option>
                            <option value="Video">Video</option>
                            <option value="Images">Images</option>
                            <option value="Music">Music</option>
                            <option value="Documents">Documents</option>
                        </select>
                        
                        <div class="d-flex gap-2">
    <button class="btn btn-md btn-outline-primary rounded-pill d-inline-flex align-items-center px-3"
            style="white-space: nowrap;"
            onclick="show_ajax_modal('<?= base_url('centre/resources/ajax_add_file/' . $folder_id) ?>', 'Upload File')">
        <i class="mdi mdi-upload me-1"></i> Upload
    </button>

    <button class="btn btn-md btn-primary rounded-pill d-inline-flex align-items-center px-3"
            style="white-space: nowrap;"
            onclick="show_ajax_modal('<?= base_url('Centre/Resources/ajax_add/' . $folder_id) ?>', 'Add Folder')">
        <i class="mdi mdi-plus me-1"></i> Add Folder
    </button>
</div>




                    </div>
                </div>
            </div>

            <div class="row flex" id="">
                <div class="col-3">
                        <?php if ($current_folder && $current_folder['parent_id'] != 0): ?>
                        <a href="<?= base_url('centre/resources/index/'.$current_folder['parent_id'])?>" 
                        class="btn btn-sm btn-secondary mb-3">
                            ← Back
                        </a>
                        <?php endif; ?>
                    </div>
                
            </div>
            
            <!--FOLDERS AND FILES SHOW-->
            <div class="row flex" id="folderlist-data">
                <?php if (empty($folders) && empty($files)): ?>
                    <div class="col-12">
                        <div class="alert alert-info">This folder is empty.</div>
                    </div>
                <?php else: ?>
                    <!-- Folders -->
                    <?php foreach ($folders as $folder): ?>
                        <div class="col-xl-3 col-6 folder-card">
                            <div class="card bg-light shadow-none" id="folder-<?=esc($folder['id'])?>">
                                <div class="card-body">
                                    <div class="d-flex mb-1">
                                        <div class="form-check form-check-danger mb-3 fs-15 flex-grow-1">
                                            <input class="form-check-input" type="checkbox" value="" id="folderlistCheckbox_<?=esc($folder['id'])?>">
                                            <label class="form-check-label" for="folderlistCheckbox_<?=esc($folder['id'])?>"></label>
                                        </div>
                                        <div class="dropdown">
                                            <button class="btn btn-ghost-primary btn-icon btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-2-fill fs-16 align-bottom"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li><a class="dropdown-item view-item-btn" href="<?=base_url('centre/resources/index/' . $folder['id'])?>">Open</a></li>
                                                <li>
                                                    <a  class="dropdown-item edit-folder-list" href="javascript:void(0);"
                                                        onclick="show_ajax_modal('<?= base_url('Centre/Resources/ajax_rename/' . $folder['id']) ?>', 'Rename Folder')">
                                                        Rename
                                                    </a>
                                                </li>
                                                <li><a class="dropdown-item" href="<?=base_url('centre/resources/delete_folder/' . $folder['id'])?>">Delete</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                    <!--CLICKABLE SECTION-->
                                    <div class="card bg-light shadow-none"
                                           style="cursor: pointer;"
                                           href="<?=base_url('centre/resources/index/' . $folder['id'])?>">
                                        
                                        <div class="text-center">
                                            <div class="mb-2">
                                                <a href="<?=base_url('centre/resources/index/' . $folder['id'])?>">
                                                    <i class="ri-folder-3-fill align-bottom text-warning display-5"></i>
                                                </a>
                                            </div>
                                            <h6 class="fs-15 folder-name"><?=esc($folder['name'])?></h6>
                                        </div>
                                        <div class="align-self-end">
                                            <div class="mb-2">
                                                <small class="text-muted"><?= $folder['size'] ?? '' ?></small>
                                            </div>
                                        </div>      
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <!-- Files -->
                    <?php foreach ($files as $file): ?>
                    
                    
                        <div class="col-xl-3 col-6 file-card">
                            <div class="card bg-light shadow-none" id="file-<?=esc($file['id'])?>">
                                <div class="card-body">
                                    <div class="d-flex mb-1">
                                        <div class="form-check form-check-danger mb-3 fs-15 flex-grow-1">
                                            <input class="form-check-input" type="checkbox" value="" id="filelistCheckbox_<?=esc($file['id'])?>">
                                            <label class="form-check-label" for="filelistCheckbox_<?=esc($file['id'])?>"></label>
                                        </div>
                                        <div class="dropdown">
                                            <button class="btn btn-ghost-primary btn-icon btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-2-fill fs-16 align-bottom"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                
                                                <li><a class="dropdown-item view-item-btn" href="javascript:void(0);"
                                                        onclick="show_ajax_modal('<?= base_url('centre/resources/ajax_view_file/' . $file['id']) ?>', 'View File')">View</a></li>
                                                <li><a class="dropdown-item" href="<?=base_url('centre/resources/download/' . $file['id'])?>"download>Download</a></li>
                                                <li><a class="dropdown-item" href="<?=base_url('centre/resources/delete_file/' . $file['id'])?>">Delete</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="card bg-light shadow-none"
                                           style="cursor: pointer;"
                                           onclick="show_ajax_modal('<?= base_url('centre/resources/ajax_view_file/' . $file['id']) ?>', 'View File')">
                                        <div class="text-center">
                                            <div class="mb-2">
                                                <!--GETTING EXTENSIONS TO SHOW SUITABLE ICONS-->
    
                                                <?php
                                                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                                                
                                                $icon = 'ri-file-text-fill';
                                                if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif'])) {
                                                    $icon = 'ri-image-2-fill';
                                                } elseif (in_array($ext, ['mp4', 'avi', 'mov'])) {
                                                    $icon = 'ri-video-fill';
                                                } elseif ($ext === 'pdf') {
                                                    $icon = 'ri-file-pdf-fill';
                                                } elseif ($ext === 'txt') {
                                                    $icon = 'ri-file-text-fill';
                                                } elseif (in_array($ext, ['mp3', 'wav', 'aac'])) {
                                                    $icon = 'ri-music-fill';
                                                } elseif (in_array($ext, ['doc', 'docx'])) {
                                                    $icon = 'ri-file-word-fill';
                                                } elseif (in_array($ext, ['ppt', 'pptx'])) {
                                                    $icon = 'ri-file-ppt-fill';
                                                } else {
                                                    $icon = 'ri-file-3-fill'; // default icon for unknown types
                                                }
                                                ?>
                                                <!--icon-->
                                                <i class="<?=esc($icon)?> align-bottom text-primary display-5"></i>
                                            </div>
                                            <h6 class="fs-15 file-name"><?=esc($file['name'])?></h6>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<script>
// document.addEventListener('DOMContentLoaded', function() {
//     const folders = document.querySelectorAll('#folderlist-data .folder-card');
//     folders.forEach(folder => {
//         folder.style.cursor = 'pointer';
//         folder.addEventListener('click', function(e) {
//             if (e.target.closest('.form-check-input, .dropdown, .dropdown-menu')) {
//                 return;
//             }
//             const folderId = this.id.split('-')[1];
//             window.location.href = '/centre/resources/index/' + folderId;
//         });
//     });

//     const files = document.querySelectorAll('#folderlist-data .file-card');
//     files.forEach(file => {
//         file.style.cursor = 'pointer';
//         file.addEventListener('click', function(e) {
//             if (e.target.closest('.form-check-input, .dropdown, .dropdown-menu')) {
//                 return;
//             }
//             const fileId = this.id.split('-')[1];
//             window.location.href = '/centre/resources/view/' + fileId;
//         });
//     });
// });
</script>