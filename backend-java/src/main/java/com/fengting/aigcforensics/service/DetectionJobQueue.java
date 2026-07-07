package com.fengting.aigcforensics.service;

public interface DetectionJobQueue {

    void enqueue(String taskId);
}
